// Copyright(c) 2019-2025 pypy, Natsumi and individual contributors.
// All rights reserved.
//
// This work is licensed under the terms of the MIT license.
// For a copy, see <https://opensource.org/licenses/MIT>.

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using NLog;

#if !LINUX && !ELECTRON
using CefSharp;
#endif

namespace VRCX
{
    /// <summary>
    /// Monitors the VRChat log files for changes and provides access to the log data.
    /// </summary>
    public class LogWatcher
    {
        public static readonly LogWatcher Instance;
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();
        private Dictionary<string, LogContext> m_LogContextMap; // <FileName, LogContext>
        private DirectoryInfo m_LogDirectoryInfo;
        private List<string[]> m_LogList;
        private ReaderWriterLockSlim m_LogListLock;
        private bool m_FirstRun = true;
        private bool m_ResetLog;
        private bool threadActive;
        private Thread? m_Thread;
        private DateTime tillDate;
        public bool VrcClosedGracefully;
        private readonly ConcurrentQueue<string> m_LogQueue = new ConcurrentQueue<string>(); // for electron

        // NOTE
        // FileSystemWatcher() is unreliable

        static LogWatcher()
        {
            Instance = new LogWatcher();
        }

        public void Init()
        {
            var logPath = Program.AppApiInstance.GetVRChatAppDataLocation();
            m_LogDirectoryInfo = new DirectoryInfo(logPath);
            m_LogContextMap = new Dictionary<string, LogContext>();
            m_LogListLock = new ReaderWriterLockSlim();
            m_LogList = new List<string[]>();
            logger.Info("LogWatcher.Init: Initialized - logPath={0}", m_LogDirectoryInfo.FullName);
            System.Console.WriteLine($"[LogWatcher] Init: logPath={m_LogDirectoryInfo.FullName}");
            m_Thread = new Thread(ThreadLoop)
            {
                IsBackground = true
            };
            m_Thread.Start();
        }

        public void Exit()
        {
            threadActive = false;
            var thread = m_Thread;
            m_Thread = null;
            thread.Interrupt();
            thread.Join();
        }

        public void Reset()
        {
            m_ResetLog = true;
            m_Thread?.Interrupt();
        }

        public void SetDateTill(string date)
        {
            tillDate = DateTime.Parse(date, CultureInfo.InvariantCulture, DateTimeStyles.None).ToUniversalTime();
            threadActive = true;
            logger.Info("SetDateTill: {0}", tillDate.ToLocalTime());
            System.Console.WriteLine($"[LogWatcher] SetDateTill: {tillDate.ToLocalTime()}, threadActive={threadActive}");
        }

        private void ThreadLoop()
        {
            while (m_Thread != null)
            {
                if (threadActive)
                    Update();

                try
                {
                    Thread.Sleep(1000);
                }
                catch (ThreadInterruptedException)
                {
                }
            }
        }

        /// <summary>
        /// Updates the log watcher by checking for new log files and updating the log list.
        /// </summary>
        private void Update()
        {
            if (m_ResetLog)
            {
                m_FirstRun = true;
                m_ResetLog = false;
                m_LogContextMap.Clear();
                m_LogListLock.EnterWriteLock();
                try
                {
                    m_LogList.Clear();
                }
                finally
                {
                    m_LogListLock.ExitWriteLock();
                }
            }

            if (!threadActive)
            {
                logger.Debug("Update: threadActive=False, skipping update");
                return;
            }

            var deletedNameSet = new HashSet<string>(m_LogContextMap.Keys);
            m_LogDirectoryInfo.Refresh();
            
            logger.Debug("Update: Starting - threadActive={0}, tillDate={1}, m_FirstRun={2}, directory exists={3}", 
                threadActive, tillDate, m_FirstRun, m_LogDirectoryInfo.Exists);

            if ((m_LogDirectoryInfo.LinkTarget == null && m_LogDirectoryInfo.Exists) || Directory.Exists(m_LogDirectoryInfo.LinkTarget))
            {
                var fileInfos = m_LogDirectoryInfo.GetFiles("output_log_*.txt", SearchOption.TopDirectoryOnly);
                
                logger.Debug("Update: Found {0} log files in directory", fileInfos.Length);

                // sort by creation time
                Array.Sort(fileInfos, (a, b) => a.CreationTimeUtc.CompareTo(b.CreationTimeUtc));

                var filesToParse = 0;
                var filesSkipped = 0;
                foreach (var fileInfo in fileInfos)
                {
                    fileInfo.Refresh();
                    if (!fileInfo.Exists)
                        continue;

                    if (DateTime.Compare(fileInfo.LastWriteTimeUtc, tillDate) < 0)
                    {
                        filesSkipped++;
                        if (filesSkipped <= 3) // Only log first 3 skipped files to avoid spam
                        {
                            logger.Debug("Update: Skipping file {0} - LastWriteTimeUtc {1} < tillDate {2}", 
                                fileInfo.Name, fileInfo.LastWriteTimeUtc, tillDate);
                        }
                        continue;
                    }
                    filesToParse++;

                    if (m_LogContextMap.TryGetValue(fileInfo.Name, out var logContext))
                    {
                        deletedNameSet.Remove(fileInfo.Name);
                    }
                    else
                    {
                        logContext = new LogContext();
                        m_LogContextMap.Add(fileInfo.Name, logContext);
                    }

                    if (logContext.Length == fileInfo.Length)
                        continue;

                    logContext.Length = fileInfo.Length;
                    ParseLog(fileInfo, logContext);
                }
                
                if (filesToParse > 0 || filesSkipped > 0)
                {
                    logger.Debug("Update: Processed {0} files to parse, {1} files skipped (older than tillDate)", filesToParse, filesSkipped);
                }
            }
            else
            {
                logger.Debug("Update: Log directory does not exist or is invalid: {0}", m_LogDirectoryInfo.FullName);
            }

            foreach (var name in deletedNameSet)
            {
                m_LogContextMap.Remove(name);
            }

            // For Electron builds, queue all events from m_LogList after first run completes
#if LINUX || ELECTRON
            if (m_FirstRun)
            {
                logger.Info("Update: First run complete - m_LogList.Count={0}, threadActive={1}", m_LogList.Count, threadActive);
                System.Console.WriteLine($"[LogWatcher] Update: First run complete - m_LogList.Count={m_LogList.Count}, threadActive={threadActive}");
                if (m_LogList.Count > 0)
                {
                    m_LogListLock.EnterReadLock();
                    try
                    {
                        foreach (var item in m_LogList)
                        {
                            var logLine = JsonSerializer.Serialize(item);
                            m_LogQueue.Enqueue(logLine);
                        }
                        logger.Info("Update: Queued {0} events to m_LogQueue (new length={1})", m_LogList.Count, m_LogQueue.Count);
                        System.Console.WriteLine($"[LogWatcher] Update: ✅ Queued {m_LogList.Count} events to m_LogQueue after first run (queue length={m_LogQueue.Count})");
                    }
                    finally
                    {
                        m_LogListLock.ExitReadLock();
                    }
                }
                else
                {
                    System.Console.WriteLine($"[LogWatcher] Update: ⚠️ First run complete but m_LogList is empty - no events to queue");
                }
            }
#endif
            m_FirstRun = false;
        }

        /// <summary>
        /// Parses the log file starting from the current position and updates the log context.
        /// </summary>
        /// <param name="fileInfo">The file information of the log file to parse.</param>
        /// <param name="logContext">The log context to update.</param>
        private void ParseLog(FileInfo fileInfo, LogContext logContext)
        {
            var line = string.Empty;
            var linesRead = 0;
            var joinLeaveLinesFound = 0;
            var eventsAdded = 0;
            try
            {
                using var stream = new FileStream(fileInfo.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 65536, FileOptions.SequentialScan);
                stream.Position = logContext.Position;
                var initialPosition = stream.Position;
                using var streamReader = new StreamReader(stream, Encoding.UTF8);
                        logger.Debug("ParseLog: Starting parse of {0}, position: {1}, tillDate: {2}", fileInfo.Name, initialPosition, tillDate);
                        System.Console.WriteLine($"[LogWatcher] ParseLog: Starting parse of {fileInfo.Name}, position: {initialPosition}, tillDate: {tillDate}");
                while (true)
                {
                    line = streamReader.ReadLine();
                    if (line == null)
                    {
                        logContext.Position = stream.Position;
                        logger.Debug("ParseLog: Finished parsing {0}, read {1} lines, found {2} join/leave lines, final position: {3}", 
                            fileInfo.Name, linesRead, joinLeaveLinesFound, stream.Position);
                        if (joinLeaveLinesFound > 0)
                        {
                            System.Console.WriteLine($"[LogWatcher] ParseLog: Finished parsing {fileInfo.Name}, read {linesRead} lines, found {joinLeaveLinesFound} join/leave lines, final position: {stream.Position}");
                        }
                        break;
                    }

                    linesRead++;

                    if (line.Length == 0)
                    {
                        continue;
                    }

                    // Check if this line contains join/leave events
                    var isJoinLeaveLine = line.Contains("[Behaviour] OnPlayerJoined") || 
                                         line.Contains("[NetworkManager] OnPlayerJoined") ||
                                         line.Contains("[Behaviour] OnPlayerLeft") || 
                                         line.Contains("[NetworkManager] OnPlayerLeft");
                    if (isJoinLeaveLine)
                    {
                        joinLeaveLinesFound++;
                        logger.Debug("ParseLog: Found join/leave line #{0} in {1}: {2}", joinLeaveLinesFound, fileInfo.Name, line.Length > 100 ? line.Substring(0, 100) + "..." : line);
                        System.Console.WriteLine($"[LogWatcher] Found join/leave line #{joinLeaveLinesFound} in {fileInfo.Name}: {(line.Length > 100 ? line.Substring(0, 100) + "..." : line)}");
                    }

                    // 2020.10.31 23:36:28 Log        -  [VRCFlowManagerVRC] Destination fetching: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd
                    // 2021.02.03 10:18:58 Log        -  [ǄǄǅǅǅǄǄǅǅǄǅǅǅǅǄǄǄǅǅǄǄǅǅǅǅǄǅǅǅǅǄǄǄǄǄǅǄǅǄǄǄǅǅǄǅǅǅ] Destination fetching: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd

                    if (ParseLogUdonException(fileInfo, line))
                        continue;

                    if (line.Length <= 36 ||
                        line[31] != '-')
                    {
                        if (isJoinLeaveLine)
                        {
                            logger.Debug("ParseLog: Join/leave line failed length/format check: length={0}, char[31]='{1}'", 
                                line.Length, line.Length > 31 ? line[31].ToString() : "N/A");
                        }
                        continue;
                    }

                    if (DateTime.TryParseExact(
                            line.Substring(0, 19),
                            "yyyy.MM.dd HH:mm:ss",
                            CultureInfo.InvariantCulture,
                            DateTimeStyles.None,
                            out var lineDate
                        ))
                    {
                        lineDate = lineDate.ToUniversalTime();
                        // check if date is older than last database entry
                        if (DateTime.Compare(lineDate, tillDate) <= 0)
                        {
                            if (isJoinLeaveLine)
                            {
                                logger.Info("ParseLog: JOIN/LEAVE LINE FILTERED BY DATE - lineDate: {0}, tillDate: {1}, diff: {2}ms, line: {3}", 
                                    lineDate, tillDate, (tillDate - lineDate).TotalMilliseconds, line.Length > 100 ? line.Substring(0, 100) + "..." : line);
                                System.Console.WriteLine($"[LogWatcher] ⚠️ JOIN/LEAVE LINE FILTERED BY DATE - lineDate: {lineDate}, tillDate: {tillDate}, diff: {(tillDate - lineDate).TotalMilliseconds}ms, line: {(line.Length > 100 ? line.Substring(0, 100) + "..." : line)}");
                            }
                            // Skip old logs silently
                            continue;
                        }
                        // check if datetime is over an hour into the future (compensate for gamelog not handling daylight savings time correctly)
                        if (DateTime.UtcNow.AddMinutes(61) < lineDate)
                        {
                            logger.Warn("Invalid log time, too new: {0}", line);
                            if (isJoinLeaveLine)
                            {
                                logger.Info("ParseLog: JOIN/LEAVE LINE FILTERED - date too new: {0}, line: {1}", lineDate, line.Length > 100 ? line.Substring(0, 100) + "..." : line);
                            }
                            continue;
                        }
                        
                        if (isJoinLeaveLine)
                        {
                            logger.Debug("ParseLog: Join/leave line passed date filter - lineDate: {0}, tillDate: {1}, diff: {2}ms", 
                                lineDate, tillDate, (lineDate - tillDate).TotalMilliseconds);
                            System.Console.WriteLine($"[LogWatcher] Join/leave line passed date filter - lineDate: {lineDate}, tillDate: {tillDate}, diff: {(lineDate - tillDate).TotalMilliseconds}ms");
                        }
                    }
                    else
                    {
                        logger.Warn("Failed to parse log date: {0}", line);
                        if (isJoinLeaveLine)
                        {
                            logger.Info("ParseLog: JOIN/LEAVE LINE FAILED DATE PARSING: {0}", line.Length > 100 ? line.Substring(0, 100) + "..." : line);
                        }
                        continue;
                    }

                    var offset = 34;
                    if (line[offset] == '[')
                    {
                        if (isJoinLeaveLine)
                        {
                            logger.Debug("ParseLog: Join/leave line reached parser, offset: {0}, calling ParseLogOnPlayerJoinedOrLeft", offset);
                            System.Console.WriteLine($"[LogWatcher] Join/leave line reached parser, offset: {offset}, calling ParseLogOnPlayerJoinedOrLeft");
                        }
                        var parsed = ParseLogOnPlayerJoinedOrLeft(fileInfo, logContext, line, offset);
                        if (parsed)
                        {
                            eventsAdded++;
                            if (isJoinLeaveLine)
                            {
                                logger.Debug("ParseLog: ParseLogOnPlayerJoinedOrLeft returned: {0}, eventsAdded={1}", parsed, eventsAdded);
                            }
                        }
                        if (parsed ||
                            ParseLogLocation(fileInfo, logContext, line, offset) ||
                            ParseLogLocationDestination(fileInfo, logContext, line, offset) ||
                            ParseLogPortalSpawn(fileInfo, logContext, line, offset) ||
                            ParseLogNotification(fileInfo, logContext, line, offset) ||
                            ParseLogAPIRequest(fileInfo, logContext, line, offset) ||
                            ParseLogAvatarChange(fileInfo, logContext, line, offset) ||
                            ParseLogJoinBlocked(fileInfo, logContext, line, offset) ||
                            ParseLogAvatarPedestalChange(fileInfo, logContext, line, offset) ||
                            ParseLogVideoError(fileInfo, logContext, line, offset) ||
                            ParseLogVideoChange(fileInfo, logContext, line, offset) ||
                            ParseLogAVProVideoChange(fileInfo, logContext, line, offset) ||
                            ParseLogUsharpVideoPlay(fileInfo, logContext, line, offset) ||
                            ParseLogUsharpVideoSync(fileInfo, logContext, line, offset) ||
                            ParseLogWorldVRCX(fileInfo, logContext, line, offset) ||
                            ParseLogWorldDataVRCX(fileInfo, logContext, line, offset) ||
                            ParseLogOnAudioConfigurationChanged(fileInfo, logContext, line, offset) ||
                            ParseLogScreenshot(fileInfo, logContext, line, offset) ||
                            ParseLogStringDownload(fileInfo, logContext, line, offset) ||
                            ParseLogImageDownload(fileInfo, logContext, line, offset) ||
                            ParseVoteKick(fileInfo, logContext, line, offset) ||
                            ParseFailedToJoin(fileInfo, logContext, line, offset) ||
                            ParseInstanceResetWarning(fileInfo, logContext, line, offset) ||
                            ParseVoteKickInitiation(fileInfo, logContext, line, offset) ||
                            ParseVoteKickSuccess(fileInfo, logContext, line, offset) ||
                            ParseStickerSpawn(fileInfo, logContext, line, offset))
                        {
                        }
                    }
                    else
                    {
                        if (ParseLogShaderKeywordsLimit(fileInfo, logContext, line, offset) ||
                            ParseLogSDK2VideoPlay(fileInfo, logContext, line, offset) ||
                            ParseApplicationQuit(fileInfo, logContext, line, offset) ||
                            ParseOpenVRInit(fileInfo, logContext, line, offset) ||
                            ParseDesktopMode(fileInfo, logContext, line, offset) ||
                            ParseOscFailedToStart(fileInfo, logContext, line, offset) ||
                            ParseUntrustedUrl(fileInfo, logContext, line, offset))
                        {
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.Warn(ex, "Failed to parse log file: {0} {1} {2}", fileInfo.FullName, line, ex.Message);
            }
            
            if (linesRead > 0 || eventsAdded > 0)
            {
                logger.Debug("ParseLog: Finished parsing {0} - linesRead={1}, eventsAdded={2}, joinLeaveLinesFound={3}, newPosition={4}", 
                    fileInfo.Name, linesRead, eventsAdded, joinLeaveLinesFound, logContext.Position);
            }
        }

        private void AppendLog(string[] item)
        {
            var eventType = item.Length > 2 ? item[2] : "unknown";
            var isJoinLeave = eventType == "player-joined" || eventType == "player-left";
            
            if (isJoinLeave)
            {
                logger.Info("AppendLog: Appending {0} event - m_FirstRun={1}, m_LogList.Count={2}, item length={3}", 
                    eventType, m_FirstRun, m_LogList.Count, item.Length);
                System.Console.WriteLine($"[LogWatcher] AppendLog: Appending {eventType} event - m_FirstRun={m_FirstRun}, m_LogList.Count={m_LogList.Count}, item length={item.Length}");
            }
            
            m_LogListLock.EnterWriteLock();
            try
            {
                if (!m_FirstRun)
                {
                    var logLine = JsonSerializer.Serialize(item);
#if LINUX || ELECTRON
                    m_LogQueue.Enqueue(logLine);
                    if (isJoinLeave)
                    {
                        logger.Info("AppendLog: Enqueued {0} event to m_LogQueue (length={1})", eventType, m_LogQueue.Count);
                        System.Console.WriteLine($"[LogWatcher] AppendLog: ✅ Enqueued {eventType} event to m_LogQueue (length={m_LogQueue.Count})");
                    }
#else
                    if (MainForm.Instance != null && MainForm.Instance.Browser != null)
                        MainForm.Instance.Browser.ExecuteScriptAsync("window?.$pinia?.gameLog.addGameLogEvent", logLine);
                    if (isJoinLeave)
                    {
                        logger.Info("AppendLog: Sent {0} event to CEF browser", eventType);
                    }
#endif
                }
                else
                {
                    if (isJoinLeave)
                    {
                        logger.Info("AppendLog: m_FirstRun=true, event will only be added to m_LogList, not queued");
                    }
                }

                m_LogList.Add(item);
                if (isJoinLeave)
                {
                    logger.Info("AppendLog: {0} event added to m_LogList (new count={1})", eventType, m_LogList.Count);
                }
            }
            finally
            {
                m_LogListLock.ExitWriteLock();
            }
        }

        public List<string> GetLogLines()
        {
            // for electron
            var logLines = new List<string>();
            var joinLeaveCount = 0;
            var locationCount = 0;
            var otherCount = 0;
            var queueSizeBefore = m_LogQueue.Count;
            var m_FirstRunSnapshot = m_FirstRun;
            
            while (m_LogQueue.TryDequeue(out var logLine))
            {
                logLines.Add(logLine);
                // Check event type
                try
                {
                    var parsed = JsonSerializer.Deserialize<string[]>(logLine);
                    if (parsed != null && parsed.Length > 2)
                    {
                        var eventType = parsed[2];
                        if (eventType == "player-joined" || eventType == "player-left")
                            joinLeaveCount++;
                        else if (eventType == "location")
                            locationCount++;
                        else
                            otherCount++;
                    }
                }
                catch
                {
                    // Ignore parse errors
                }
            }
            
            // Always log GetLogLines to help debug empty queue issue
            logger.Debug("LogWatcher.GetLogLines: Queue size before={0}, m_FirstRun={1}, threadActive={2}, returning {3} log lines (join/leave={4}, location={5}, other={6})", 
                queueSizeBefore, m_FirstRunSnapshot, threadActive, logLines.Count, joinLeaveCount, locationCount, otherCount);
            if (logLines.Count > 0 || queueSizeBefore > 0 || queueSizeBefore == 0)
            {
                System.Console.WriteLine($"[LogWatcher] GetLogLines: Queue size before={queueSizeBefore}, m_FirstRun={m_FirstRunSnapshot}, threadActive={threadActive}, returning {logLines.Count} log lines (join/leave={joinLeaveCount}, location={locationCount}, other={otherCount})");
            }

            return logLines;
        }

        private string ConvertLogTimeToISO8601(string line)
        {
            // 2020.10.31 23:36:22

            if (DateTime.TryParseExact(
                    line.Substring(0, 19),
                    "yyyy.MM.dd HH:mm:ss",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var dt
                ))
            {
                dt = dt.ToUniversalTime();
            }
            else
            {
                dt = DateTime.UtcNow;
            }

            // ISO 8601
            return dt.ToString("yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fff'Z'", CultureInfo.InvariantCulture);
        }

        private bool ParseLogLocation(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2020.10.31 23:36:28 Log        -  [VRCFlowManagerVRC] Destination fetching: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd
            // 2020.10.31 23:36:28 Log        -  [VRCFlowManagerVRC] Destination set: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd
            // 2020.10.31 23:36:31 Log        -  [RoomManager] Entering Room: VRChat Home
            // 2020.10.31 23:36:31 Log        -  [RoomManager] Joining wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd:67646~private(usr_4f76a584-9d4b-46f6-8209-8305eb683661)~nonce(D9298A536FEEEDDBB61633661A4BDAA09717C5178DEF865C4C09372FE12E09A6)
            // 2020.10.31 23:36:31 Log        -  [RoomManager] Joining or Creating Room: VRChat Home
            // 2020.10.31 23:36:31 Log        -  [RoomManager] Successfully joined room
            // 2021.02.03 10:18:58 Log        -  [ǄǄǅǅǅǄǄǅǅǄǅǅǅǅǄǄǄǅǅǄǄǅǅǅǅǄǅǅǅǅǄǄǄǄǄǅǄǅǄǄǄǅǅǄǅǅǅ] Destination fetching: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd
            // 2021.06.23 12:02:56 Log        -  [Behaviour] Entering Room: VRChat Home

            if (line.Contains("[Behaviour] Entering Room: "))
            {
                var lineOffset = line.LastIndexOf("] Entering Room: ", StringComparison.Ordinal);
                if (lineOffset < 0)
                    return true;
                lineOffset += 17;
                if (lineOffset > line.Length)
                    return true;

                var worldName = line.Substring(lineOffset);
                logContext.RecentWorldName = worldName;
                return true;
            }

            if (line.Contains("[Behaviour] Joining ") && !line.Contains("] Joining or Creating Room: ") && !line.Contains("] Joining friend: "))
            {
                var lineOffset = line.LastIndexOf("] Joining ", StringComparison.Ordinal);
                if (lineOffset < 0)
                    return true;
                lineOffset += 10;
                if (lineOffset >= line.Length)
                    return true;

                var location = line.Substring(lineOffset);

                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "location",
                    location,
                    logContext.RecentWorldName
                });

                // logContext.onJoinPhotonDisplayName = string.Empty;
                // logContext.onJoinPhotonDisplayNameDate = string.Empty;
                logContext.LastAudioDevice = string.Empty;
                logContext.VideoPlaybackErrors.Clear();
                VrcClosedGracefully = false;

                return true;
            }

            return false;
        }

        private bool ParseLogScreenshot(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // This won't work with VRChat's new "Multi Layer" camera mode, since it doesn't output any logs like normal pictures.
            // 2023.02.08 12:31:35 Log        -  [VRC Camera] Took screenshot to: C:\Users\Tea\Pictures\VRChat\2023-02\VRChat_2023-02-08_12-31-35.104_1920x1080.png
            if (!line.Contains("[VRC Camera] Took screenshot to: "))
                return false;

            var lineOffset = line.LastIndexOf("] Took screenshot to: ", StringComparison.Ordinal);
            if (lineOffset < 0)
                return true;

            var screenshotPath = line.Substring(lineOffset + 22);
            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "screenshot",
                screenshotPath
            });
            return true;
        }

        private bool ParseLogLocationDestination(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.09.02 00:02:12 Log        -  [Behaviour] Destination set: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd:15609~private(usr_032383a7-748c-4fb2-94e4-bcb928e5de6b)~nonce(72CC87D420C1D49AEFFBEE8824C84B2DF0E38678E840661E)
            // 2021.09.02 00:49:15 Log        -  [Behaviour] Destination fetching: wrld_4432ea9b-729c-46e3-8eaf-846aa0a37fdd
            // 2022.08.13 18:57:00 Log        -  [Behaviour] OnLeftRoom
            // 2024.11.22 15:32:28 Log        -  [Behaviour] Successfully left room

            if (line.Contains("[Behaviour] Successfully left room"))
            {
                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "location-destination",
                    logContext.LocationDestination
                });

                logContext.LocationDestination = string.Empty;

                return true;
            }

            if (line.Contains("[Behaviour] Destination fetching: "))
            {
                var lineOffset = line.LastIndexOf("] Destination fetching: ", StringComparison.Ordinal);
                if (lineOffset < 0)
                    return true;
                lineOffset += 24;
                if (lineOffset >= line.Length)
                    return true;

                logContext.LocationDestination = line.Substring(lineOffset);

                return true;
            }

            return false;
        }

        private bool ParseLogOnPlayerJoinedOrLeft(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2020.10.31 23:36:58 Log        -  [NetworkManager] OnPlayerJoined pypy
            // 2020.10.31 23:36:58 Log        -  [Player] Initialized PlayerAPI "pypy" is local
            // 2020.10.31 23:36:58 Log        -  [NetworkManager] OnPlayerJoined Rize♡
            // 2020.10.31 23:36:58 Log        -  [Player] Initialized PlayerAPI "Rize♡" is remote

            // 2020.11.01 00:07:01 Log        -  [NetworkManager] OnPlayerLeft Rize♡
            // 2020.11.01 00:07:01 Log        -  [PlayerManager] Removed player 2 / Rize♡
            // 2020.11.01 00:07:02 Log        -  [Player] Unregistering Rize♡

            // 2021.06.23 11:41:16 Log        -  [Behaviour] Initialized PlayerAPI "Natsumi-sama" is local

            // 2021.12.12 11:47:22 Log        -  [Behaviour] OnPlayerJoined Natsumi-sama
            // 2021.12.12 11:47:22 Log        -  [Behaviour] OnPlayerJoined:Unnamed
            // 2021.12.12 11:53:14 Log        -  [Behaviour] OnPlayerLeftRoom

            // Future logs will be formatted like this: [Behaviour] OnPlayerJoined Natsumi-sama (usr_032383a7-748c-4fb2-94e4-bcb928e5de6b)

            var hasJoined = line.Contains("[Behaviour] OnPlayerJoined") || line.Contains("[NetworkManager] OnPlayerJoined");
            var hasLeft = line.Contains("[Behaviour] OnPlayerLeft") || line.Contains("[NetworkManager] OnPlayerLeft");
            var hasJoinedColon = line.Contains("] OnPlayerJoined:");
            var hasLeftRoom = line.Contains("] OnPlayerLeftRoom");
            var hasLeftColon = line.Contains("] OnPlayerLeft:");

            logger.Debug("ParseLogOnPlayerJoinedOrLeft: hasJoined={0}, hasLeft={1}, hasJoinedColon={2}, hasLeftRoom={3}, hasLeftColon={4}", 
                hasJoined, hasLeft, hasJoinedColon, hasLeftRoom, hasLeftColon);

            if (hasJoined && !hasJoinedColon)
            {
                logger.Info("ParseLogOnPlayerJoinedOrLeft: PROCESSING JOIN EVENT - line: {0}", line.Length > 150 ? line.Substring(0, 150) + "..." : line);
                System.Console.WriteLine($"[LogWatcher] 🔵 PROCESSING JOIN EVENT: {(line.Length > 150 ? line.Substring(0, 150) + "..." : line)}");
                var lineOffset = line.LastIndexOf("] OnPlayerJoined", StringComparison.Ordinal);
                logger.Debug("ParseLogOnPlayerJoinedOrLeft: lineOffset={0}, line.Length={1}", lineOffset, line.Length);
                if (lineOffset < 0)
                {
                    logger.Warn("ParseLogOnPlayerJoinedOrLeft: lineOffset < 0, returning true");
                    return true;
                }
                lineOffset += 17;
                if (lineOffset > line.Length)
                {
                    logger.Warn("ParseLogOnPlayerJoinedOrLeft: lineOffset > line.Length ({0} > {1}), returning true", lineOffset, line.Length);
                    return true;
                }

                var userInfoString = line.Substring(lineOffset);
                logger.Debug("ParseLogOnPlayerJoinedOrLeft: userInfoString='{0}'", userInfoString);
                var userInfo = ParseUserInfo(userInfoString);
                logger.Debug("ParseLogOnPlayerJoinedOrLeft: Parsed userInfo - DisplayName='{0}', UserId='{1}'", userInfo.DisplayName, userInfo.UserId);
                
                if (string.IsNullOrEmpty(userInfo.DisplayName) && string.IsNullOrEmpty(userInfo.UserId))
                {
                    logger.Warn("ParseLogOnPlayerJoinedOrLeft: Failed to parse user info from log line: {0}", line);
                    return true;
                }

                var timestamp = ConvertLogTimeToISO8601(line);
                logger.Info("ParseLogOnPlayerJoinedOrLeft: SUCCESS - Appending player-joined event: DisplayName='{0}', UserId='{1}', timestamp='{2}'", 
                    userInfo.DisplayName, userInfo.UserId, timestamp);
                System.Console.WriteLine($"[LogWatcher] ✅ SUCCESS - Appending player-joined: DisplayName='{userInfo.DisplayName}', UserId='{userInfo.UserId}', timestamp='{timestamp}'");

                AppendLog(new[]
                {
                    fileInfo.Name,
                    timestamp,
                    "player-joined",
                    userInfo.DisplayName ?? string.Empty,
                    userInfo.UserId ?? string.Empty
                });

                logger.Info("ParseLogOnPlayerJoinedOrLeft: player-joined event appended successfully");
                return true;
            }

            if (hasLeft && !hasLeftRoom && !hasLeftColon)
            {
                logger.Info("ParseLogOnPlayerLeft: PROCESSING LEFT EVENT - line: {0}", line.Length > 150 ? line.Substring(0, 150) + "..." : line);
                System.Console.WriteLine($"[LogWatcher] 🔴 PROCESSING LEFT EVENT: {(line.Length > 150 ? line.Substring(0, 150) + "..." : line)}");
                var lineOffset = line.LastIndexOf("] OnPlayerLeft", StringComparison.Ordinal);
                logger.Debug("ParseLogOnPlayerLeft: lineOffset={0}, line.Length={1}", lineOffset, line.Length);
                if (lineOffset < 0)
                {
                    logger.Warn("ParseLogOnPlayerLeft: lineOffset < 0, returning true");
                    return true;
                }
                lineOffset += 15;
                if (lineOffset > line.Length)
                {
                    logger.Warn("ParseLogOnPlayerLeft: lineOffset > line.Length ({0} > {1}), returning true", lineOffset, line.Length);
                    return true;
                }

                var userInfoString = line.Substring(lineOffset);
                logger.Debug("ParseLogOnPlayerLeft: userInfoString='{0}'", userInfoString);
                var userInfo = ParseUserInfo(userInfoString);
                logger.Debug("ParseLogOnPlayerLeft: Parsed userInfo - DisplayName='{0}', UserId='{1}'", userInfo.DisplayName, userInfo.UserId);
                
                if (string.IsNullOrEmpty(userInfo.DisplayName) && string.IsNullOrEmpty(userInfo.UserId))
                {
                    logger.Warn("ParseLogOnPlayerLeft: Failed to parse user info from log line: {0}", line);
                    return true;
                }

                var timestamp = ConvertLogTimeToISO8601(line);
                logger.Info("ParseLogOnPlayerLeft: SUCCESS - Appending player-left event: DisplayName='{0}', UserId='{1}', timestamp='{2}'", 
                    userInfo.DisplayName, userInfo.UserId, timestamp);
                System.Console.WriteLine($"[LogWatcher] ✅ SUCCESS - Appending player-left: DisplayName='{userInfo.DisplayName}', UserId='{userInfo.UserId}', timestamp='{timestamp}'");

                AppendLog(new[]
                {
                    fileInfo.Name,
                    timestamp,
                    "player-left",
                    userInfo.DisplayName ?? string.Empty,
                    userInfo.UserId ?? string.Empty
                });

                logger.Info("ParseLogOnPlayerLeft: player-left event appended successfully");
                return true;
            }

            logger.Debug("ParseLogOnPlayerJoinedOrLeft: No match found, returning false");
            return false;
        }

        private bool ParseLogPortalSpawn(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.04.06 11:25:45 Log        -  [Network Processing] RPC invoked ConfigurePortal on (Clone [1600004] Portals/PortalInternalDynamic) for Natsumi-sama
            // 2021.07.19 04:24:28 Log        -  [Behaviour] Will execute SendRPC/AlwaysBufferOne on (Clone [100004] Portals/PortalInternalDynamic) (UnityEngine.GameObject) for Natsumi-sama: S: "ConfigurePortal" I: 7 F: 0 B: 255 (local master owner)
            // 2022.07.29 18:40:37 Log        -  [Behaviour] Instantiated a (Clone [800004] Portals/PortalInternalDynamic)
            // 2023 - deadge

            if (line.Contains("[Behaviour] Instantiated a (Clone [") && line.Contains("] Portals/PortalInternalDynamic)"))
            {
                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "portal-spawn"
                });
                return true;
            }

            return false;
        }

        private bool ParseLogShaderKeywordsLimit(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.04.04 12:21:06 Error      -  Maximum number (256) of shader keywords exceeded, keyword _TOGGLESIMPLEBLUR_ON will be ignored.
            // 2021.08.20 04:20:69 Error      -  Maximum number (384) of shader global keywords exceeded, keyword _FOG_EXP2 will be ignored.

            if (line.Contains("Maximum number (384) of shader global keywords exceeded"))
            {
                if (logContext.ShaderKeywordsLimitReached)
                    return true;

                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "event",
                    "Shader Keyword Limit has been reached"
                });
                logContext.ShaderKeywordsLimitReached = true;

                return true;
            }

            return false;
        }

        private bool ParseLogJoinBlocked(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.04.07 09:34:37 Error      -  [Behaviour] Master is not sending any events! Moving to a new instance.

            if (!line.Contains("] Master is not sending any events! Moving to a new instance."))
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                "Joining instance blocked by master"
            });

            return true;
        }

        private bool ParseLogAvatarPedestalChange(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.05.07 10:48:19 Log        -  [Network Processing] RPC invoked SwitchAvatar on AvatarPedestal for User

            if (string.Compare(line, offset, "[Network Processing] RPC invoked SwitchAvatar on AvatarPedestal for ", 0, 68, StringComparison.Ordinal) != 0)
                return false;

            var data = line.Substring(offset + 68);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                $"{data} changed avatar pedestal"
            });

            return true;
        }

        private bool ParseLogVideoError(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.04.08 06:37:45 Error -  [Video Playback] ERROR: Video unavailable
            // 2021.04.08 06:40:07 Error -  [Video Playback] ERROR: Private video

            // 2024.07.31 22:28:47 Error      -  [AVProVideo] Error: Loading failed.  File not found, codec not supported, video resolution too high or insufficient system resources.
            // 2024.07.31 23:04:15 Error      -  [AVProVideo] Error: Loading failed.  File not found, codec not supported, video resolution too high or insufficient system resources.

            // 2025.05.04 22:38:12 Error      -  Attempted to play an untrusted URL (Domain: localhost) that is not allowlisted for public instances. If this URL is needed for the world to work, the domain needs to be added to the world's Video Player Allowed Domains list on the website.
            const string youtubeBotError = "Sign in to confirm";
            const string youtubeBotErrorFixUrl = "[VRCX] Fix error with this: https://github.com/EllyVR/VRCVideoCacher";

            if (line.Contains("[Video Playback] ERROR: "))
            {
                var data = line.Substring(offset + 24);
                if (!logContext.VideoPlaybackErrors.Add(data))
                    return true;

                if (data.Contains(youtubeBotError))
                    data = $"{youtubeBotErrorFixUrl}\n{data}";

                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "event",
                    "VideoError: " + data
                });

                return true;
            }

            if (line.Contains("[AVProVideo] Error: "))
            {
                var data = line.Substring(offset + 20);
                if (!logContext.VideoPlaybackErrors.Add(data))
                    return true;

                if (data.Contains(youtubeBotError))
                    data = $"{youtubeBotErrorFixUrl}\n{data}";

                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "event",
                    "VideoError: " + data
                });

                return true;
            }

            return false;
        }

        private bool ParseUntrustedUrl(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2025.05.04 22:38:12 Error      -  Attempted to play an untrusted URL (Domain: localhost) that is not allowlisted for public instances. If this URL is needed for the world to work, the domain needs to be added to the world's Video Player Allowed Domains list on the website.

            if (line.Contains("Attempted to play an untrusted URL"))
            {
                var data = line.Substring(offset);
                if (!logContext.VideoPlaybackErrors.Add(data))
                    return true;

                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "event",
                    "VideoError: " + data
                });

                return true;
            }

            return false;
        }

        private bool ParseLogWorldVRCX(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // [VRCX] VideoPlay(PyPyDance) "https://jd.pypy.moe/api/v1/videos/-Q3pdlsQxOk.mp4",0.5338666,260.6938,"1339 : Le Freak (Random)"

            if (string.Compare(line, offset, "[VRCX] ", 0, 7, StringComparison.Ordinal) != 0)
                return false;

            var data = line.Substring(offset + 7);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "vrcx",
                data
            });

            return true;
        }

        private bool ParseLogWorldDataVRCX(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // [VRCX-World] store:test:testvalue

            if (string.Compare(line, offset, "[VRCX-World] ", 0, 13, StringComparison.Ordinal) != 0)
                return false;

            var data = line.Substring(offset + 13);

            // PWI, deprecated
            logger.Info("VRCX-World data: {0}", data);
            return true;
        }

        private bool ParseLogVideoChange(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.04.20 13:37:69 Log        -  [Video Playback] Attempting to resolve URL 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

            if (string.Compare(line, offset, "[Video Playback] Attempting to resolve URL '", 0, 44, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf('\'');
            if (pos < 0)
                return false;

            var data = line.Substring(offset + 44);
            data = data.Remove(data.Length - 1);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "video-play",
                data
            });

            return true;
        }

        private bool ParseLogAVProVideoChange(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.05.12 15:53:48 Log        -  [Video Playback] Resolving URL 'rtspt://topaz.chat/live/kiriri520'

            if (string.Compare(line, offset, "[Video Playback] Resolving URL '", 0, 32, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf('\'');
            if (pos < 0)
                return false;

            var data = line.Substring(offset + 32);
            data = data.Remove(data.Length - 1);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "video-play",
                data
            });

            return true;
        }

        private bool ParseLogSDK2VideoPlay(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.04.23 13:12:25 Log        -  User Natsumi-sama added URL https://www.youtube.com/watch?v=dQw4w9WgXcQ

            if (string.Compare(line, offset, "User ", 0, 5, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf(" added URL ", StringComparison.Ordinal);
            if (pos < 0)
                return false;

            var displayName = line.Substring(offset + 5, pos - (offset + 5));
            var data = line.Substring(pos + 11);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "video-play",
                data,
                displayName
            });

            return true;
        }

        private bool ParseLogUsharpVideoPlay(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.12.12 05:51:58 Log        -  [USharpVideo] Started video load for URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s, requested by ʜ ᴀ ᴘ ᴘ ʏ

            if (string.Compare(line, offset, "[USharpVideo] Started video load for URL: ", 0, 42, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf(", requested by ", StringComparison.Ordinal);
            if (pos < 0)
                return false;

            var data = line.Substring(offset + 42, pos - (offset + 42));
            var displayName = line.Substring(pos + 15);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "video-play",
                data,
                displayName
            });

            return true;
        }

        private bool ParseLogUsharpVideoSync(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2022.01.16 05:20:23 Log        -  [USharpVideo] Syncing video to 2.52

            if (string.Compare(line, offset, "[USharpVideo] Syncing video to ", 0, 31, StringComparison.Ordinal) != 0)
                return false;

            var data = line.Substring(offset + 31);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "video-sync",
                data
            });

            return true;
        }

        private bool ParseLogNotification(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.01.03 05:48:58 Log        -  [API] Received Notification: < Notification from username:pypy, sender user id:usr_4f76a584-9d4b-46f6-8209-8305eb683661 to of type: friendRequest, id: not_3a8f66eb-613c-4351-bee3-9980e6b5652c, created at: 01/14/2021 15:38:40 UTC, details: {{}}, type:friendRequest, m seen:False, message: ""> received at 01/02/2021 16:48:58 UTC

            if (string.Compare(line, offset, "[API] Received Notification: <", 0, 30, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf("> received at ", StringComparison.Ordinal);
            if (pos < 0)
                return false;

            var data = line.Substring(offset + 30, pos - (offset + 30));

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "notification",
                data
            });

            return true;
        }

        private bool ParseLogAPIRequest(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2021.10.03 09:49:50 Log        -  [API] [110] Sending Get request to https://api.vrchat.cloud/api/1/worlds?apiKey=JlE5Jldo5Jibnk5O5hTx6XVqsJu4WJ26&organization=vrchat&userId=usr_032383a7-748c-4fb2-94e4-bcb928e5de6b&n=99&order=descending&offset=0&releaseStatus=public&maxUnityVersion=2019.4.31f1&minUnityVersion=5.5.0f1&maxAssetVersion=4&minAssetVersion=0&platform=standalonewindows
            // 2021.10.03 09:48:43 Log        -  [API] [101] Sending Get request to https://api.vrchat.cloud/api/1/users/usr_032383a7-748c-4fb2-94e4-bcb928e5de6b?apiKey=JlE5Jldo5Jibnk5O5hTx6XVqsJu4WJ26&organization=vrchat

            if (string.Compare(line, offset, "[API] [", 0, 7, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf("] Sending Get request to ", StringComparison.Ordinal);
            if (pos < 0)
                return false;

            var data = line.Substring(pos + 25);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "api-request",
                data
            });

            return true;
        }

        private bool ParseLogAvatarChange(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.11.05 14:45:57 Log        -  [Behaviour] Switching K․MOG to avatar MoeSera

            if (string.Compare(line, offset, "[Behaviour] Switching ", 0, 22, StringComparison.Ordinal) != 0)
                return false;

            var pos = line.LastIndexOf(" to avatar ", StringComparison.Ordinal);
            if (pos < 0)
                return false;

            var displayName = line.Substring(offset + 22, pos - (offset + 22));
            var avatarName = line.Substring(pos + 11);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "avatar-change",
                displayName,
                avatarName
            });

            return true;
        }

        // private bool ParseLogPhotonId(FileInfo fileInfo, LogContext logContext, string line, int offset)
        // {
        //     // 2021.11.02 02:21:41 Log        -  [Behaviour] Configuring remote player VRCPlayer[Remote] 22349737 1194
        //     // 2021.11.02 02:21:41 Log        -  [Behaviour] Initialized player Natsumi-sama
        //
        //     // 2021.11.10 08:10:28 Log        -  [Behaviour] Initialize Limb Avatar (UnityEngine.Animator) VRCPlayer[Remote] 78614426 59 (ǄǄǄǅǄǅǅǄǅǄǄǅǅǄǅǄǅǅǅǄǄǄǅǄǄǅǅǄǅǅǄǅǅǄǅǅǅǅǄǅǄǅǄǄǄǄǅ) False Loading
        //     // 2021.11.10 08:57:32 Log        -  [Behaviour] Initialize Limb Avatar (UnityEngine.Animator) VRCPlayer[Local] 59136629 1 (ǄǄǄǅǄǅǅǄǅǄǄǅǅǄǅǄǅǅǅǄǄǄǅǄǄǅǅǄǅǅǄǅǅǄǅǅǅǅǄǅǄǅǄǄǄǄǅ) True Loading
        //
        //     // 2022.03.05 11:29:16 Log        -  [Behaviour] Initialize ThreePoint Avatar (UnityEngine.Animator) VRCPlayer[Local] 50608765 1 (ǄǅǄǄǄǅǄǅǅǄǅǄǄǅǅǄǄǄǅǄǄǄǅǄǅǄǅǅǄǄǄǄǅǅǄǄǄǄǅǅǄǄǅǄǄǅǅ) True Custom
        //
        //     if (line.Contains("] Initialize ") && line.Contains(" Avatar (UnityEngine.Animator) VRCPlayer["))
        //     {
        //         var pos = -1;
        //
        //         if (line.Contains(" Avatar (UnityEngine.Animator) VRCPlayer[Remote] "))
        //         {
        //             pos = line.LastIndexOf(" Avatar (UnityEngine.Animator) VRCPlayer[Remote] ");
        //             pos += 49;
        //         }
        //
        //         if (line.Contains(" Avatar (UnityEngine.Animator) VRCPlayer[Local] "))
        //         {
        //             pos = line.LastIndexOf(" Avatar (UnityEngine.Animator) VRCPlayer[Local] ");
        //             pos += 48;
        //         }
        //
        //         if (pos < 0)
        //             return false;
        //
        //         if (!string.IsNullOrEmpty(logContext.onJoinPhotonDisplayName))
        //         {
        //             var endPos = line.LastIndexOf(" (");
        //             var photonId = line.Substring(pos + 9, endPos - (pos + 9));
        //
        //             AppendLog(new[]
        //             {
        //                 fileInfo.Name,
        //                 ConvertLogTimeToISO8601(line),
        //                 "photon-id",
        //                 logContext.onJoinPhotonDisplayName,
        //                 photonId
        //             });
        //             logContext.onJoinPhotonDisplayName = string.Empty;
        //
        //             return true;
        //         }
        //     }
        //
        //     if (line.Contains("[Behaviour] Initialized player "))
        //     {
        //         var pos = line.LastIndexOf("[Behaviour] Initialized player ");
        //         if (pos < 0)
        //             return false;
        //
        //         pos += 31;
        //         if (pos >= line.Length)
        //             return false;
        //         
        //         var displayName = line.Substring(pos, line.Length - pos);
        //         logContext.onJoinPhotonDisplayName = displayName;
        //         logContext.onJoinPhotonDisplayNameDate = ConvertLogTimeToISO8601(line);
        //
        //         return true;
        //     }
        //
        //     if (line.Contains("[Behaviour] Configuring remote player VRCPlayer[Remote] "))
        //     {
        //         if (string.IsNullOrEmpty(logContext.onJoinPhotonDisplayName) || 
        //             logContext.onJoinPhotonDisplayNameDate != ConvertLogTimeToISO8601(line))
        //             return false;
        //
        //         var pos = line.LastIndexOf("[Behaviour] Configuring remote player VRCPlayer[Remote] ");
        //         if (pos < 0)
        //             return false;
        //
        //         pos += 56;
        //         var startPos = pos + 9;
        //         var length = line.Length - startPos;
        //         var photonId = line.Substring(startPos, length);
        //
        //         AppendLog(new[]
        //         {
        //             fileInfo.Name,
        //             ConvertLogTimeToISO8601(line),
        //             "photon-id",
        //             logContext.onJoinPhotonDisplayName,
        //             photonId
        //         });
        //         logContext.onJoinPhotonDisplayName = string.Empty;
        //         logContext.onJoinPhotonDisplayNameDate = string.Empty;
        //
        //         return true;
        //     }
        //
        //     return false;
        // }

        private bool ParseLogOnAudioConfigurationChanged(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2022.03.15 03:40:34 Log        -  [Always] uSpeak: SetInputDevice 0 (3 total) 'Index HMD Mic (Valve VR Radio & HMD Mic)'
            // 2022.03.15 04:02:22 Log        -  [Always] uSpeak: OnAudioConfigurationChanged - devicesChanged = True, resetting mic..
            // 2022.03.15 04:02:22 Log        -  [Always] uSpeak: SetInputDevice by name 'Index HMD Mic (Valve VR Radio & HMD Mic)' (3 total)
            // 2025.01.03 19:11:42 Log        -  [Always] uSpeak: SetInputDevice 0 (2 total) 'Microphone (NVIDIA Broadcast)'

            if (line.Contains("[Always] uSpeak: OnAudioConfigurationChanged"))
            {
                logContext.AudioDeviceChanged = true;
                return true;
            }

            if (line.Contains("[Always] uSpeak: SetInputDevice 0"))
            {
                var lineOffset = line.LastIndexOf(") '", StringComparison.Ordinal);
                if (lineOffset < 0)
                    return true;
                lineOffset += 3;
                var endPos = line.Length - 1;
                var length = Math.Min(endPos - lineOffset + 1, line.Length - lineOffset);
                if (length <= 0)
                    return true;

                var audioDevice = line.Substring(lineOffset, length);
                if (string.IsNullOrEmpty(logContext.LastAudioDevice))
                {
                    logContext.AudioDeviceChanged = false;
                    logContext.LastAudioDevice = audioDevice;
                    return true;
                }

                if (!logContext.AudioDeviceChanged || logContext.LastAudioDevice == audioDevice)
                    return true;

                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "event",
                    $"Audio device changed, mic set to '{audioDevice}'"
                });

                logContext.LastAudioDevice = audioDevice;
                logContext.AudioDeviceChanged = false;

                return true;
            }

            return false;
        }

        private bool ParseLogUdonException(FileInfo fileInfo, string line)
        {
            // 2022.11.29 04:27:33 Error      -  [UdonBehaviour] An exception occurred during Udon execution, this UdonBehaviour will be halted.
            // VRC.Udon.VM.UdonVMException: An exception occurred in an UdonVM, execution will be halted. --->VRC.Udon.VM.UdonVMException: An exception occurred during EXTERN to 'VRCSDKBaseVRCPlayerApi.__get_displayName__SystemString'. --->System.NullReferenceException: Object reference not set to an instance of an object.

            if (line.Contains("[PyPyDance]"))
            {
                AppendLog(new[]
                {
                    fileInfo.Name,
                    ConvertLogTimeToISO8601(line),
                    "udon-exception",
                    line
                });
                return true;
            }

            var lineOffset = line.IndexOf(" ---> VRC.Udon.VM.UdonVMException: ", StringComparison.Ordinal);
            if (lineOffset < 0)
                return false;

            var data = line.Substring(lineOffset);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "udon-exception",
                data
            });

            return true;
        }

        private bool ParseApplicationQuit(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2022.06.12 01:51:46 Log        -  VRCApplication: OnApplicationQuit at 1603.499
            // 2024.10.23 21:18:34 Log        -  VRCApplication: HandleApplicationQuit at 936.5161
            if (string.Compare(line, offset, "VRCApplication: OnApplicationQuit at ", 0, 37, StringComparison.Ordinal) != 0 &&
                string.Compare(line, offset, "VRCApplication: HandleApplicationQuit at ", 0, 41, StringComparison.Ordinal) != 0)
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "vrc-quit"
            });

            VrcClosedGracefully = true;

            return true;
        }

        private bool ParseOpenVRInit(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2022.07.29 02:52:14 Log        -  OpenVR initialized!

            // 2023.04.22 16:52:28 Log        -  Initializing VRSDK.
            // 2023.04.22 16:52:29 Log        -  StartVRSDK: Open VR Loader

            // 2024.07.26 01:48:56 Log        -  STEAMVR HMD Model: Index

            if (string.Compare(line, offset, "Initializing VRSDK.", 0, 19, StringComparison.Ordinal) != 0 &&
                string.Compare(line, offset, "STEAMVR HMD Model: ", 0, 20, StringComparison.Ordinal) != 0)
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "openvr-init"
            });

            return true;
        }

        private bool ParseDesktopMode(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.04.22 16:54:18 Log        -  VR Disabled

            if (string.Compare(line, offset, "VR Disabled", 0, 11, StringComparison.Ordinal) != 0)
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "desktop-mode"
            });

            return true;
        }

        private bool ParseLogStringDownload(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.03.23 11:37:21 Log        -  [String Download] Attempting to load String from URL 'https://pastebin.com/raw/BaW6NL2L'
            var check = "] Attempting to load String from URL '";
            if (!line.Contains(check))
                return false;

            var lineOffset = line.LastIndexOf(check, StringComparison.Ordinal);
            if (lineOffset < 0)
                return true;

            var stringData = line.Substring(lineOffset + check.Length);
            stringData = stringData.Remove(stringData.Length - 1);

            if (stringData.StartsWith("http://127.0.0.1:22500") || stringData.StartsWith("http://localhost:22500"))
                return true; // ignore own requests

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "resource-load-string",
                stringData
            });
            return true;
        }

        private bool ParseLogImageDownload(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.03.23 11:32:25 Log        -  [Image Download] Attempting to load image from URL 'https://i.imgur.com/lCfUMX0.jpeg'
            var check = "] Attempting to load image from URL '";
            if (!line.Contains(check))
                return false;

            var lineOffset = line.LastIndexOf(check, StringComparison.Ordinal);
            if (lineOffset < 0)
                return true;

            var imageData = line.Substring(lineOffset + check.Length);
            imageData = imageData.Remove(imageData.Length - 1);

            if (imageData.StartsWith("http://127.0.0.1:22500") || imageData.StartsWith("http://localhost:22500"))
                return true; // ignore own requests

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "resource-load-image",
                imageData
            });
            return true;
        }

        private bool ParseVoteKick(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.06.02 01:08:04 Log        -  [Behaviour] Received executive message: You have been kicked from the instance by majority vote
            // 2023.06.02 01:11:58 Log        -  [Behaviour] You have been kicked from this world for an hour.

            if (string.Compare(line, offset, "[Behaviour] Received executive message: ", 0, 40, StringComparison.Ordinal) != 0)
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                line.Substring(offset + 40)
            });
            return true;
        }

        private bool ParseFailedToJoin(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.09.01 10:42:19 Warning    -  [Behaviour] Failed to join instance 'wrld_78eb6b52-fd5a-4954-ba28-972c92c8cc77:82384~hidden(usr_a9bf892d-b447-47ce-a572-20c83dbfffd8)~region(eu)' due to 'That instance is using an outdated version of VRChat. You won't be able to join them until they update!'

            if (string.Compare(line, offset, "[Behaviour] Failed to join instance ", 0, 36, StringComparison.Ordinal) != 0)
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                line.Substring(offset + 12)
            });
            return true;
        }

        private bool ParseOscFailedToStart(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2023.09.26 04:12:57 Warning    -  Could not Start OSC: Address already in use

            if (string.Compare(line, offset, "Could not Start OSC: ", 0, 21, StringComparison.Ordinal) != 0)
                return false;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                $"VRChat couldn't start OSC server, \"{line.Substring(offset)}\""
            });
            return true;
        }

        private bool ParseInstanceResetWarning(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2024.08.30 01:43:40 Log        -  [ModerationManager] This instance will be reset in 60 minutes due to its age.
            if (!line.Contains("[ModerationManager] This instance will be reset in "))
                return false;

            int index = line.IndexOf("[ModerationManager] This instance will be reset in ", StringComparison.Ordinal) + 20;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                line[index..]
            });

            return true;
        }

        private bool ParseVoteKickInitiation(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2024.08.29 02:04:47 Log        -  [ModerationManager] A vote kick has been initiated against בורקס במאווררים 849d, do you agree?
            if (!line.Contains("[ModerationManager] A vote kick has been initiated against ", StringComparison.Ordinal))
                return false;

            int index = line.IndexOf("[ModerationManager] A vote kick has been initiated against ", StringComparison.Ordinal) + 20;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                line[index..]
            });

            return true;
        }

        private bool ParseVoteKickSuccess(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // 2024.08.29 02:05:21 Log        -  [ModerationManager] Vote to kick בורקס במאווררים 849d succeeded
            if (!line.Contains("[ModerationManager] Vote to kick ", StringComparison.Ordinal))
                return false;

            int index = line.IndexOf("[ModerationManager] Vote to kick ", StringComparison.Ordinal) + 20;

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "event",
                line[index..]
            });

            return true;
        }

        private bool ParseStickerSpawn(FileInfo fileInfo, LogContext logContext, string line, int offset)
        {
            // [StickersManager] User usr_032383a7-748c-4fb2-94e4-bcb928e5de6b (Natsumi-sama) spawned sticker inv_8b380ee4-9a8a-484e-a0c3-b01290b92c6a
            var index = line.IndexOf("[StickersManager] User ", StringComparison.Ordinal);
            if (index == -1 || !line.Contains("inv_") || !line.Contains("spawned sticker"))
                return false;

            var info = line.Substring(index + 23);

            var (userId, displayName) = ParseUserInfo(info); // it's flipped
            if (string.IsNullOrEmpty(displayName) && string.IsNullOrEmpty(userId))
            {
                logger.Warn("Failed to parse user info from log line: {0}", line);
                return true;
            }

            var inventoryIdIndex = info.IndexOf("inv_", StringComparison.Ordinal);
            var inventoryId = info.Substring(inventoryIdIndex);

            AppendLog(new[]
            {
                fileInfo.Name,
                ConvertLogTimeToISO8601(line),
                "sticker-spawn",
                userId ?? string.Empty,
                displayName ?? string.Empty,
                inventoryId
            });

            return true;
        }

        public string[][] Get()
        {
            logger.Debug("LogWatcher.Get: Called - m_ResetLog={0}, m_LogList.Count={1}, m_FirstRun={2}", 
                m_ResetLog, m_LogList.Count, m_FirstRun);
            System.Console.WriteLine($"[LogWatcher] Get: Called - m_ResetLog={m_ResetLog}, m_LogList.Count={m_LogList.Count}, m_FirstRun={m_FirstRun}");
            
            Update();

            if (m_ResetLog == false &&
                m_LogList.Count > 0)
            {
                m_LogListLock.EnterWriteLock();
                try
                {
                    string[][] items;

                    if (m_LogList.Count > 1000)
                    {
                        items = new string[1000][];
                        m_LogList.CopyTo(0, items, 0, 1000);
                        
                        // Count join/leave events in the batch
                        var joinLeaveCount = 0;
                        for (int i = 0; i < items.Length && i < 1000; i++)
                        {
                            if (items[i].Length > 2 && (items[i][2] == "player-joined" || items[i][2] == "player-left"))
                                joinLeaveCount++;
                        }
                        if (joinLeaveCount > 0)
                        {
                            logger.Info("LogWatcher.Get: Returning {0} items (first 1000), {1} are join/leave events", items.Length, joinLeaveCount);
                        }
                        
                        m_LogList.RemoveRange(0, 1000);
                    }
                    else
                    {
                        items = m_LogList.ToArray();
                        
                        // Count join/leave events
                        var joinLeaveCount = 0;
                        for (int i = 0; i < items.Length; i++)
                        {
                            if (items[i].Length > 2 && (items[i][2] == "player-joined" || items[i][2] == "player-left"))
                                joinLeaveCount++;
                        }
                        if (joinLeaveCount > 0)
                        {
                            logger.Info("LogWatcher.Get: Returning {0} items (all), {1} are join/leave events", items.Length, joinLeaveCount);
                            System.Console.WriteLine($"[LogWatcher] Get: ✅ Returning {items.Length} items (all), {joinLeaveCount} are join/leave events");
                            for (int i = 0; i < items.Length; i++)
                            {
                                if (items[i].Length > 2 && (items[i][2] == "player-joined" || items[i][2] == "player-left"))
                                {
                                    logger.Info("LogWatcher.Get: Item {0}: type={1}, displayName={2}, userId={3}, timestamp={4}", 
                                        i, items[i][2], items[i].Length > 3 ? items[i][3] : "N/A", items[i].Length > 4 ? items[i][4] : "N/A", items[i].Length > 1 ? items[i][1] : "N/A");
                                    System.Console.WriteLine($"[LogWatcher] Get: Item {i}: type={items[i][2]}, displayName={(items[i].Length > 3 ? items[i][3] : "N/A")}, userId={(items[i].Length > 4 ? items[i][4] : "N/A")}, timestamp={(items[i].Length > 1 ? items[i][1] : "N/A")}");
                                }
                            }
                        }
                        
                        m_LogList.Clear();
                    }

                    logger.Debug("LogWatcher.Get: Returning {0} items, m_LogList.Count after clear={1}", items.Length, m_LogList.Count);
                    return items;
                }
                finally
                {
                    m_LogListLock.ExitWriteLock();
                }
            }

            logger.Debug("LogWatcher.Get: Returning empty array - m_ResetLog={0}, m_LogList.Count={1}", m_ResetLog, m_LogList.Count);
            System.Console.WriteLine($"[LogWatcher] Get: Returning empty array - m_ResetLog={m_ResetLog}, m_LogList.Count={m_LogList.Count}");
            return new string[][] { };
        }

        private static (string? DisplayName, string? UserId) ParseUserInfo(string userInfo)
        {
            string? userDisplayName;
            string? userId;

            int pos = userInfo.LastIndexOf(" (", StringComparison.Ordinal);
            if (pos >= 0)
            {
                userDisplayName = userInfo.Substring(0, pos);
                userId = userInfo.Substring(pos + 2, userInfo.LastIndexOf(')') - (pos + 2));
            }
            else
            {
                userDisplayName = userInfo;
                userId = null;
            }

            return (userDisplayName, userId);
        }

        private class LogContext
        {
            public bool AudioDeviceChanged;
            public string LastAudioDevice;
            public readonly HashSet<string> VideoPlaybackErrors = new(50);
            public long Length;
            public string LocationDestination;
            public long Position;
            public string RecentWorldName;
            public bool ShaderKeywordsLimitReached;
        }
    }
}
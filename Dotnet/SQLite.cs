using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading;
using System.Text.Json;

namespace VRCX
{
    public class SQLite
    {
        public static SQLite Instance;
        private readonly ReaderWriterLockSlim m_ConnectionLock;
        private SQLiteConnection m_Connection;

        static SQLite()
        {
            Instance = new SQLite();
        }

        public SQLite()
        {
            m_ConnectionLock = new ReaderWriterLockSlim();
        }

        public void Init()
        {
#if LINUX
            Instance = this;
#endif
            var dataSource = Program.ConfigLocation;
            var jsonDataSource = VRCXStorage.Instance.Get("VRCX_DatabaseLocation");
            if (!string.IsNullOrEmpty(jsonDataSource))
                dataSource = jsonDataSource;

            m_Connection = new SQLiteConnection($"Data Source=\"{dataSource}\";Version=3;PRAGMA locking_mode=NORMAL;PRAGMA busy_timeout=5000;PRAGMA journal_mode=WAL;PRAGMA optimize=0x10002;", true);

            m_Connection.Open();
        }

        public void Exit()
        {
            m_Connection.Close();
            m_Connection.Dispose();
        }
        
        public string ExecuteJson(string sql, IDictionary<string, object> args = null)
        {
            var result = Execute(sql, args);
            if (result.Item1 != null)
            {
                return JsonSerializer.Serialize(new
                {
                    status = "error",
                    message = result.Item1
                });
            }
            return JsonSerializer.Serialize(new
            {
                status = "success",
                data = result.Item2
            });
        }

        /// <summary>
        /// Converts a database value to a serializable primitive type for IPC communication.
        /// </summary>
        private static object ConvertToSerializableValue(object value)
        {
            if (value == null || value == DBNull.Value)
            {
                return null;
            }

            // Handle DateTime - convert to ISO 8601 string
            if (value is DateTime dateTime)
            {
                return dateTime.ToString("O"); // ISO 8601 format
            }

            // Handle DateTimeOffset
            if (value is DateTimeOffset dateTimeOffset)
            {
                return dateTimeOffset.ToString("O");
            }

            // Handle byte arrays - convert to base64 string for reliable serialization
            if (value is byte[] bytes)
            {
                return Convert.ToBase64String(bytes);
            }

            // Handle primitive types that are already serializable
            if (value is string || value is int || value is long || value is short || 
                value is byte || value is uint || value is ulong || value is ushort ||
                value is float || value is double || value is decimal || value is bool ||
                value is sbyte)
            {
                return value;
            }

            // Handle nullable types
            var type = value.GetType();
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>))
            {
                var underlyingType = Nullable.GetUnderlyingType(type);
                if (underlyingType != null)
                {
                    // Unwrap the nullable and convert recursively
                    return ConvertToSerializableValue(Convert.ChangeType(value, underlyingType));
                }
            }

            // For all other types, convert to string representation
            // This ensures we never return a non-serializable object
            return value.ToString();
        }

        public Tuple<string, object[]> Execute(string sql, IDictionary<string, object> args = null)
        {
            m_ConnectionLock.EnterReadLock();
            try
            {
                using var command = new SQLiteCommand(sql, m_Connection);
                if (args != null)
                {
                    foreach (var arg in args)
                    {
                        command.Parameters.Add(new SQLiteParameter(arg.Key, arg.Value));
                    }
                }

                using var reader = command.ExecuteReader();
                var result = new List<object[]>();
                while (reader.Read())
                {
                    var values = new object[reader.FieldCount];
                    for (var i = 0; i < reader.FieldCount; i++)
                    {
                        var rawValue = reader.GetValue(i);
                        values[i] = ConvertToSerializableValue(rawValue);
                    }
                    result.Add(values);
                }
                return new Tuple<string, object[]>(null, result.ToArray());
            }
            catch (Exception ex)
            {
                return new Tuple<string, object[]>(ex.Message, null);
            }
            finally
            {
                m_ConnectionLock.ExitReadLock();
            }
        }

        public int ExecuteNonQuery(string sql, IDictionary<string, object> args = null)
        {
            int result = -1;
            m_ConnectionLock.EnterWriteLock();
            try
            {
                using var command = new SQLiteCommand(sql, m_Connection);
                if (args != null)
                {
                    foreach (var arg in args)
                    {
                        command.Parameters.Add(new SQLiteParameter(arg.Key, arg.Value));
                    }
                }
                result = command.ExecuteNonQuery();
            }
            finally
            {
                m_ConnectionLock.ExitWriteLock();
            }

            return result;
        }
    }
}

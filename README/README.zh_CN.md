<div align="center">

# <img src="https://raw.githubusercontent.com/vrcx-team/VRCX/master/images/VRCX.ico" width="64" height="64"> </img> VRCXM

**一个 [VRCX](https://github.com/vrcx-team/VRCX) 的分支，具有现代深色主题和增强功能。**

[![GitHub release](https://img.shields.io/github/release/vrcx-team/VRCX.svg)](https://github.com/vrcx-team/VRCX/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/vrcx-team/VRCX/total?color=6451f1)](https://github.com/vrcx-team/VRCX/releases/latest)
[![GitHub Workflow Status](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml/badge.svg)](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml)
[![VRCX Discord Invite](https://img.shields.io/discord/854071236363550763?color=%237289DA&logo=discord&logoColor=white&label=discord)](https://vrcx.app/discord)

| [English](/README.md) |

**注意：** 此翻译可能不是最新的。有关最新信息，特别是从 VRCX 迁移的信息，请参阅[英文版](/README.md)。

VRCXM 是 VRCX 的一个分支，是一款用于 VRChat 的外部辅助小工具，可以比 VRChat 游戏客户端（无论是 PC 模式或 VR 模式）以及它的官网更方便地提供与 VRChat 相关的信息，同时能让你更轻松地完成各种操作。此分支具有完整的重新设计，采用现代深色主题和附加功能，同时保持与原始 VRCX 的 1:1 功能。

# 开始使用

<div align="center">

**注意：** VRCXM 是一个分支，必须从源代码构建。请参阅下面的[从源代码构建](#从源代码构建)。

原始 VRCX 安装程序（`VRCX_Setup.exe`）可从[这里](https://github.com/vrcx-team/VRCX/releases/latest)下载。

# 功能

<div align="left">

- :family: 好友、世界和模型列表管理
    - 在 VRChat 之外管理你的好友/世界/群组以及模型列表。
    - 查看好友所在的房间，在线状态，以及他们的模型变动情况。
    - 记录与某人成为好友以及上次见面的时间。
    - 查看你和朋友们在世界中一起度过了多长时间（以及见了多少次）。
    - 监视好友的名字变更情况，再也不用担心某人改名之后忘了是谁了！
    - 保存备注，方便记住彼此。同时也可以通过这个提醒自己：你是怎么认识 TA 的？
- :electric_plug: 当你启动 VRChat 时自动启动其他程序
    - 你可以配置 VRCX，让其在启动 VRChat 时自动启动你指定的程序。
    - 例如，你可以在启动时让 VRCX 打开一个 OSC 应用或变声器。
- :mag: 以更加方便的形式搜索模型、房间、世界以及群组。
- :earth_americas: 创建本地的、没有任何限制的世界收藏夹
- :camera: 将世界数据存储在你在游戏内拍摄的照片中，这样即使几个月后也能知道当时是在什么世界拍的照片
- :bell: 监视通知，让你可以及时回复你的朋友
    - 你可以通过 VRCX 发送/接收各种邀请和好友请求，也可以通过它查看邀请中指向的房间信息。
- :scroll: 查看当前房间的统计信息和用户列表
- :tv: 查看你所在世界中正在播放的视频的实际链接，以及各种其他记录
- :bar_chart: 改进的 Discord 状态面板
    - 你可以选择在 Discord 的状态面板上显示更多关于当前房间的信息。
    - 针对 PyPyDance、LSMedia、Movies&Chill、VRDancing 等热门世界进行了深度集成。
    - 这包括世界封面图、世界名称、房间 ID、用户数量等，具体取决于你的状态设置以及房间是否为私人，公共房间还可以在状态面板上添加一个“加入”按钮！
- :crystal_ball: VR 叠加界面，可以用于实时监控所有受支持的事件以及通知
- :outbox_tray: 无需打开 Unity 即可上传模型以及世界的封面图
- :page_facing_up: 无需打开 Unity 即可管理已上传的模型以及世界的信息。
- :skull: 当 VRChat 崩溃时自动重启并重新加入崩溃之前的房间。
- :left_right_arrow: 一键导入/导出收藏列表。

## 从源代码构建

VRCXM 必须从源代码构建。请参阅原始 VRCX 的[从源代码构建](https://github.com/vrcx-team/VRCX/wiki/Building-from-source)指南以获取说明。构建过程与 VRCX 相同。

## 从 VRCX 迁移

VRCXM 使用单独的数据文件夹（`VRCXM`）以避免与原始 VRCX 冲突。如果您想将现有的 VRCX 数据（朋友、 feed 历史、收藏等）迁移到 VRCXM，请参阅[英文版 README](/README.md#migrating-from-vrcx) 以获取详细说明。

## 与 VRCX 的区别

- **现代深色主题**：具有美观深色美学的完整视觉重新设计
- **高级 Feed 过滤器**：活动 feed 的日期范围过滤和增强的标签/类型过滤器
- **从 Feed 隐藏朋友**：在继续跟踪其数据的同时，从活动 feed 中隐藏特定朋友的选项
- **分析仪表板**：包含以下内容的综合分析页面：
  - 活动分析：每个世界/头像的时间分解
  - 社交统计：最活跃的朋友排名
  - 世界和头像分析：最常访问的世界和头像使用统计
- **性能设置**：可配置的 feed 和游戏日志查询的最大表大小
- **单独的应用程序数据**：使用 `VRCXM` 文件夹而不是 `VRCX`
- **保留所有原始 VRCX 功能**：与原始版本 1:1 的功能对等

## 维护者

VRCXM 由 [naiolune](https://github.com/naiolune) 维护。

原始 VRCX 由 [pypy](https://github.com/pypy-vrc) 和 [Natsumi](https://github.com/Natsumi-sama) 开发。

## 原始 VRCX 资源

- 想让 VRCX 的外观看起来独特一些？请查看 [Themes](https://github.com/vrcx-team/VRCX/wiki/Themes) （英语）了解如何制作界面主题
- 查看 [Building from source](https://github.com/vrcx-team/VRCX/wiki/Building-from-source) （英语）以获得从源码构建 VRCX 的相关说明
- 若想了解如何在 Linux 上运行 VRCX，请点击[这里](https://github.com/vrcx-team/VRCX/wiki/Running-VRCX-on-Linux)（英语）查看相关说明

# 界面截图

<div align="center">

<h3>登录</h3>

<table>
  <tr>
    <td align="center"><img src="https://user-images.githubusercontent.com/47104993/246643085-8a230eb9-6bac-4f83-8f6c-4b6ea76c37e2.png" alt="login"></td>
    <td align="center"><img src="https://user-images.githubusercontent.com/47104993/246643167-b3988e3d-77ab-421f-862e-1b9fc59d46e9.png" alt="2fa"></td>
  </tr>
</table>

<h3>好友动态</h3>

<img src="https://user-images.githubusercontent.com/47104993/246643541-6c3f64cb-7a22-493e-8f66-8524caff2994.png" alt="feed">

<h3>游戏日志</h3>

<img src="https://user-images.githubusercontent.com/47104993/246643608-b8472c89-ac38-4fbe-b2f3-b6bd5be06b28.png" alt="gamelog">

<h3>用户信息页</h3>

<h4>我的</h4>

<img src="https://user-images.githubusercontent.com/47104993/246643835-d4b9e008-7a64-4163-a53c-7c01bc78a780.png" alt="me">

<h4>好友信息</h4>

<img src="https://user-images.githubusercontent.com/47104993/246644739-b1d7d2df-40f2-465e-bd50-3127ee7a6fdd.png" alt="friend">

<h3>世界信息</h3>

<table>
  <tr>
    <td align="center"><img src="https://user-images.githubusercontent.com/47104993/246643937-5a5197ed-f1dc-4fd1-abed-61467107b51c.png" alt="instance"></td>
    <td align="center"><img src="https://user-images.githubusercontent.com/47104993/246643971-a82900ab-8020-48d9-a700-0fb7db7f3892.png" alt="info"></td>
  </tr>
</table>

<h3>收藏夹</h3>

<h4>好友收藏（星标）界面</h4>

<img src="https://user-images.githubusercontent.com/47104993/246644035-edf5b224-004c-4aee-b7e7-88169834ea24.png" alt="好友收藏夹">

<h4>世界收藏界面</h4>

<img src="https://user-images.githubusercontent.com/47104993/246644127-7d055aec-5df1-44af-82a9-8b107fc2329b.png" alt="world">

<h4>模型收藏界面</h4>

<img src="https://user-images.githubusercontent.com/47104993/246644243-0ccbfc65-194e-4510-a785-16a171849cd8.png" alt="模型收藏夹">

<h3>好友日志</h3>

<img src="https://user-images.githubusercontent.com/47104993/246644384-540953c8-e5aa-49d0-82da-45728483456c.png" alt="好友日志">

<h3>Discord 状态面板</h3>

<img src="https://user-images.githubusercontent.com/47104993/246644534-5d07589e-0464-46c8-a78a-1cb927fab08e.png" alt="Discord 状态面板">

<!-- The other images will be similar to this -->
</div>

## VRCXM 有没有违反 VRChat 的服务条款？

**简而言之：没有违反**

VRCXM（与 VRCX 一样）是一个外部工具，使用 VRChat API 来提供相关功能。

它并不会以任何方式修改游戏，只是合理使用 API 来提供相应的功能。它不是 mod，也不是作弊工具，更不是对游戏任何形式的修改。

要了解 VRChat 对 API 使用的相关态度，请查看 [VRChat Discord](https://discord.gg/vrchat) 服务器的 #faq 频道。

---

VRCXM 未获得 VRChat 的认可，也不代表 VRChat 或任何正式参与制作或管理 VRChat 的个人/组织的观点或立场。VRChat 及所有相关内容均为 VRChat Inc. 的商标或注册商标。VRChat © VRChat Inc.

VRCXM 是 [VRCX](https://github.com/vrcx-team/VRCX) 的一个分支，与 VRCX 团队无关。

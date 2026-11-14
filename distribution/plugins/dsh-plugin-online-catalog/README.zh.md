---
kind: package-bundle
description: "从七牛云目录安装和更新 ZeroWall 插件与技能压缩包，无需替换桌面程序。"
---

# @zerowall/dsh-plugin-online-catalog

[English](README.md) | 中文

## 概述

这个可选组合在设置中添加“在线插件与技能”，并在更新中心添加入口。打开或刷新时读取独立发布的七牛云清单。安装兼容的新内容无需发布 EXE 或 Host Runtime；插件变更仍可能要求重启应用。只有用户明确操作才会安装内容。

## 目录

- [使用此包](#use-this-package)
- [目录配置](#catalog-configuration)
- [模型体验](#model-experience)
- [已知限制](#known-limitations)

<a id="use-this-package"></a>
## 使用此包

在现有插件页面通过 `@zerowall/dsh-plugin-online-catalog@0.1.1` 安装一次入口，或完全退出桌面程序后运行其内置命令：

```text
dsh plugin --profile desktop add @zerowall/dsh-plugin-online-catalog@0.1.1
```

重新打开桌面程序，进入“设置 → 在线插件与技能”。“刷新目录”会获取新增条目。每项内容均可单独安装或更新。“一键更新已安装项”只更新已有且有新版的项目；失败或需要重启时停止。新增项目始终需要单独选择。`zerowall-online-catalog` 组合条目在现有插件和 Skills 管理器旁挂载 Host 服务及客户端界面。

<a id="catalog-configuration"></a>
## 目录配置

默认插件地址为 `https://zerowall.chengxunkeji.cn/stable/catalog/plugins.json`；技能地址为 `https://zerowall.chengxunkeji.cn/stable/catalog/skills.json`。在组合条目上配置 `pluginIndexUrl`、`skillIndexUrl`、`home`、`fetchTimeoutMs`、`maxCatalogBytes` 或 `maxSkillBytes` 可覆盖默认值。默认每次操作允许 15 秒，每份清单限制 4 MiB，每个技能压缩包限制 64 MiB。地址必须使用 HTTPS，且不得携带凭据或片段。下载拒绝重定向。刷新失败时保留上次快照中有效的一侧，并阻止安装，直到刷新成功。

插件清单使用 [market format 1](../../../packages/util/plugin-market-index/README.zh.md)。现有插件管理器负责兼容性、构建审批、包安装、回滚和诊断日志。失败操作保留完整管理器结果，包括输出和日志路径。技能清单使用 schema 1，声明唯一 ID、版本、本地化标题及说明、不可变 HTTPS ZIP 地址、字节数、SHA-256 和完整技能名称。长度或哈希校验失败不会修改已有技能。Skills 导入器负责解压和替换；更新成功后恢复全局启停状态，启用新增技能，并保留工作区覆盖。技能版本回执以原子写入方式保存在所选 DSH 主目录下。

先发布不可变的包与压缩包，再更新[目录源文件](../../../market/catalog/README.zh.md)并刷新 CDN。已有客户端在下次明确刷新时发现新增内容；不启用定时轮询或后台安装。

<a id="model-experience"></a>
## 模型体验

此组合不添加工具或提示词内容。已安装并启用的技能通过现有技能注册表提供。

<a id="known-limitations"></a>
## 已知限制

Git 来源支持首次安装；Registry 更新使用现有管理器能力。只读或不支持更新的包来源仍可通过插件页面管理。DSH 版本不兼容时，需要使用兼容的包或更新 Host Runtime。清单本身无法提供新的 Host API。技能导入在发布后失败时，可能留下禁用或未完成配置的导入内容；界面会报告该状态，并要求重试前检查 Skills。技能版本回执描述目录安装，无法反映任意本地编辑。

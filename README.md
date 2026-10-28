# dsh-ui-tidy

把 DSH Desktop / DSH Web 的**窗口标题栏**收拾干净：一排图标直达各个页面，一处设置页管全部开关，模型选择器不再一屏四十行。

> 适用于 DeepSeek Harness（DSH）0.2.x 桌面版与 `dsh web`。纯客户端插件，不改宿主源码。

---

## 它做什么

### 1. 顶栏变成一排图标按钮

- 从**运行中的界面**发现入口：读侧栏每个面板行注册的真实 panel id（React fiber 上溯取 `PanelRow.memoizedProps.id`），所以宿主升级、或者新装插件自带面板，按钮会**自己出现**，不需要改代码。
- 图标**原样借用**每个插件自己的 SVG（`[data-dsh-panel-entry]` 或侧栏行里的真图标），没有自带图标的才用内置图形 ⇒ 不会出现「两个功能同一个图标」。
- 只显示图标，名字放在 `title` 里，鼠标停留即见。按钮可**拖拽换位**，顺序记在 `localStorage`。
- 被收起的页面不会消失：加号菜单里勾选即可回到顶栏，未勾选的也能从同一处「打开」。
- 窗口标题栏那一排和 `应用 / 编辑` 菜单栏同一套高度、圆角与 hover 底色，左侧偏移可调。

### 2. 设置 → 顶栏界面

`设置` 里新增一页 **顶栏界面**（`settings.section`），插件所有开关集中在一处：

| 分组 | 能改什么 |
| --- | --- |
| 顶栏显示哪些页面 | 每个页面一行勾选；取消的仍可从加号菜单打开 |
| 外观 | 只显示图标 / 显示文字；顶栏按钮靠左或居中；菜单栏左偏移（px）；后台任务胶囊只显示数量 |
| 模型选择菜单 | 按供应商折叠、合并同名供应商、去掉重复模型、默认折叠全部供应商 |

### 3. 模型选择器瘦身

模型菜单默认**每个供应商折叠成一行**，展开才看模型；同名供应商合并；合并后仍然重复的模型行隐藏。四个开关也能在模型菜单顶部直接点。

### 4. 会话页头部不重复

- 官方左栏整体移走（席位保留在原 React 树里、只是不占位置，第三方插件挂载点不受影响）。
- 头部两行合并成一行：标题、模式、后台任务、右侧按钮同排。
- 与顶栏重复的入口（`M.O. · 工作流`、`🧩 子代理`、页签条）从头部收起，功能改由顶栏按钮打开。
- 记忆库、小说工坊这类浮层：切页前自动让位，不再挡住顶栏；顶栏本身提到浮层之上，任何时候都点得动。

---

## 5 分钟上手（不想看下文的话只看这三条）

```powershell
# 1. 注册到 desktop profile（会先备份 package.json，只改 dependencies 与 dsh.profile.bundles）
pwsh -File scripts\install.ps1

# 2. 完全退出 DSH，再重新打开（换页面没用，bundle 清单在启动时才算）

# 3. 想看它当前状态：设置 → 顶栏界面 → 最下面的「诊断」，点「复制」
```

装坏了、或者想还原：`pwsh -File scripts\uninstall.ps1`（同样只删那两个字段）。
安装脚本支持 `-DryRun` 只看不改、`-Mode npm` 走 npm 包、`-Profile web` 装到别的 profile。

> 为什么必须重启，而不是刷新：宿主在启动时按文件内容算出 rev，页面按 rev 取 bundle；文件一改 rev 就变，旧 rev 取不到就成了 404。装上 `@deepseek-ai/dsh-hmr` 之后才有热加载。

## 安装

### 方式 0：一键脚本（推荐给不熟悉 profile 结构的人）

见上面的「5 分钟上手」。等价于手工做两件事：把 `dsh-ui-tidy` 写进 `dependencies`，再追加到 `dsh.profile.bundles`。

### 方式 A：插件市场里加索引

1. 打开 `设置 → 插件`，在「自定义插件市场」的**索引源**里加一条：

   ```
   https://raw.githubusercontent.com/jiyeguang25/dsh-ui-tidy/main/market/index.json
   ```

2. 刷新索引，搜 `UI Tidy` / `dsh-ui-tidy`，点安装。
3. 重启 DSH Desktop 生效。

### 方式 B：npm

```bash
dsh plugin --profile desktop add dsh-ui-tidy
```

等价手工步骤：`~/.dsh/profiles/desktop/package.json` 的 `dependencies` 加 `"dsh-ui-tidy": "^0.2.0"`，并把 `"dsh-ui-tidy"` 追加到 `dsh.profile.bundles`，然后在 profile 目录 `pnpm install`。

### 方式 C：本地目录（开发）

```bash
cd ~/.dsh/profiles/desktop
# package.json: "dsh-ui-tidy": "link:/绝对路径/dsh-ui-tidy"，bundles 里加 "dsh-ui-tidy"
pnpm install
```

---

## 生效方式

- 改 `client.js`（或任何被启动清单装载的文件）：**必须重启宿主**。宿主按文件内容算 rev，页面按 rev 取 bundle，rev 一改旧缓存就 404，刷新只会卡在 `Loading plugins…`。
- 装 `@deepseek-ai/dsh-hmr` 后才有热加载（宿主 `clientModules.rebuilt()` 是它的登记钩子）。
- 改包名、`dsh.profile.bundles` 这类**装配信息**：同样需要重启。
- 纯设置项（顶栏显示哪些页面、折叠、对齐）：即时生效，不需要重启。

## 卸载

```bash
dsh plugin --profile desktop remove dsh-ui-tidy
```

插件被卸载或禁用时会自己收尾：还原 `--dsh-windows-menu-start`、把被缩写的后台任务文案写回长句、移除注入的样式与席位注册。

## 顶栏没出现 / 界面不对劲时，怎么自己救回来

不用改任何 JSON，也不用重装。三档开关，写在地址栏或控制台里：

| 你想做什么 | 做法 | 效果 |
| --- | --- | --- |
| 完全停用它 | 地址栏加 `?uidy=off`，或控制台执行 `localStorage["dsh-ui-tidy.safeMode"]="off"` 后刷新 | 插件一行都不跑，界面回到 DSH 原版 |
| 只保留顶栏 | `?uidy=minimal` | 顶栏还在，但**不再接管左侧栏**（最常见的冲突就来自接管这一层） |
| 恢复正常 | `?uidy=on` | 清掉上面两个标记并重试 |

另外：**连续两次激活失败会自动降级到 minimal**，并在控制台打出 `[ui-tidy] gave up the sidebar takeover…`。看到这条就说明是插件自身出错，而不是你的界面坏了——先按上表恢复，再把控制台里那条 `activation failed` 的原文发出来即可定位。

## 风险与已知限制

- 纯前端改造，只使用公开席位（`shell.overlay`、`conversation.header.leading`、`settings.section`）与公开服务（`slots`、`layout`、`locale`），不 patch 宿主代码。
- 面板发现依赖侧栏行的 React fiber 结构：宿主若重写侧栏组件需要更新 `readRowPanelId()`。届时顶栏仍能工作，只是新面板要等一版适配（硬编码回退仍在）。
- 只对 Web GUI 有效（`platform: web`），ACL / CLI 界面不受影响。

## 持续集成

仓库里的 CI 配方放在 `ci/github-actions.yml`，而不是 `.github/workflows/ci.yml`：写这个仓库的访问码没有 `workflow` 权限，一旦提交到 `.github/workflows/` 就会被 GitHub 拒收（`refusing to allow a Personal Access Token to create or update workflow ... without workflow scope`）。

想启用 CI，两条路任选：

1. 把 `ci/github-actions.yml` 复制到 `.github/workflows/ci.yml`，用带 `workflow` 权限的访问码提交；
2. 在网页端新建 `.github/workflows/ci.yml`，把同一份内容粘进去。

## 自检

```bash
node --check client.js
node smoke/smoke-client.mjs   # 34 条离线断言：样式契约、席位注册、图标化、设置页渲染与 handler
```

## 许可

MIT

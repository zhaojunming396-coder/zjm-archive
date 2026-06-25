# 日期倒计时工具

本项目是一个 macOS 日期倒计时工具集合，用于把目标日期、学习计划或重要节点放在桌面上持续提醒。仓库中保留了 Swift 原生版本、Swift 桌面计时版本和 Python Tkinter 版本，方便在不同场景下使用或继续迭代。

## 当前功能

- 日期倒计时：显示距离目标日期还有多少天。
- 可编辑标题、文案、目标日期和目标时间。
- 支持窗口置顶，方便学习或备考时长期放在桌面。
- Swift 原生日期版支持选择本地壁纸。
- 桌面计时版本支持 5、10、25、45 分钟预设和自定义时分秒。
- Python Tkinter 版本会保存本地配置，下次打开继续使用。
- 提供安装、打开、开机启动和添加到 Dock 的辅助脚本。

## 项目结构

```text
DateCountdownNative/   SwiftUI 日期倒计时应用
CountdownWidget/       SwiftUI 桌面计时器应用
DesktopCountdownApp/   Python Tkinter 日期倒计时应用
*.command              macOS 辅助安装和启动脚本
```

## 运行方式

### Swift 日期倒计时版本

```bash
cd DateCountdownNative
./build.sh
open "dist/日期倒计时.app"
```

### Swift 桌面计时版本

```bash
cd CountdownWidget
./build.sh
open "build/桌面倒计时.app"
```

### Python Tkinter 日期版本

```bash
cd DesktopCountdownApp
python3 countdown.py
```

也可以在 Finder 中双击项目根目录里的 `.command` 脚本执行安装或打开操作。

## 使用说明

1. 打开应用后点击“编辑”。
2. 输入倒计时标题、说明文案、目标日期和目标时间。
3. 按需要开启或关闭窗口置顶。
4. Swift 日期版可以选择壁纸，让倒计时更适合作为桌面提醒。
5. 如果需要每天自动出现，可以使用开机启动相关脚本。

## 当前限制

- 当前主要面向 macOS。
- Swift 版本依赖本机命令行工具和 `swiftc`。
- Python 版本依赖系统 Tkinter 环境。
- 安装脚本主要服务个人本机路径，还没有做通用安装器。
- 构建产物不进入仓库，需要在本机重新执行 `build.sh` 生成。

## 下一版计划

- 统一 Swift 日期版和桌面计时版的产品形态。
- 增加多个目标日期管理。
- 增加更清晰的安装脚本说明和错误提示。
- 增加截图和更完整的使用演示。
- 考虑做一个正式的 macOS app 打包流程。

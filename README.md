# Hosts Switcher

一个基于 Tauri v2 + Rust 构建的轻量级、高性能 Windows Hosts 切换工具。支持 GUI 界面与强大的命令行 (CLI) 操作，专为开发与测试人员设计。

<p align="center">
  <img src="https://raw.githubusercontent.com/zengyufei/hosts-switcher/main/img/index.png" alt="Hosts Switcher Main Interface" width="600" />
</p>

## ✨ 主要功能

- **环境切换**: 快速在 Dev、Test、Prod 等多套 Hosts 配置间切换。
- **组合模式**: 支持 **单选** (互斥) 和 **多选** (叠加) 两种模式。
  > _多选模式演示:_
  > 
  > ![Multi-Select Mode](https://raw.githubusercontent.com/zengyufei/hosts-switcher/main/img/multi.png)
- **公共配置**: 设置所有环境通用的 hosts 规则 (Common Config)。
  > _公共配置界面:_
  >
  > ![Common Config](https://raw.githubusercontent.com/zengyufei/hosts-switcher/main/img/common.png)

- **系统保护**: 自动备份系统原始 Hosts，确保可随时还原。
- **智能提权**: 自动检测并请求管理员权限，无需手动右键“以管理员运行”。
- **CLI 支持**: 完整的命令行接口，支持脚本化调用、CI/CD 集成。
- **数据便携**: 支持配置的导入导出 (JSON 全量备份或单文件)。

## 🚀 快速开始

### 开发环境要求
- Node.js & npm (or pnpm/yarn)
- Rust (Cargo)
- Visual Studio C++ Build Tools (Windows)

### 构建运行

```bash
# 安装前端依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建发布版本 (生成的 exe 位于 src-tauri/target/release/)
npm run tauri build
```

## 📖 命令行 (CLI) 用法

`hosts-switcher.exe` 不仅是 GUI 程序，也是一个命令行工具。在终端中运行即可执行各种操作。

> **注意**: 由于修改 Hosts 需要管理员权限，CLI 执行时也会请求提权（会弹窗或在新窗口执行）。

### 常用命令示例

#### 1. 基础操作
```powershell
# 列出所有配置及其状态
hosts-switcher list

# 切换到单选模式
hosts-switcher single

# 切换到多选模式
hosts-switcher multi
```

#### 2. 打开/关闭配置
```powershell
# 激活名为 "Dev" 的配置 (如果当前是单选模式，会关闭其他)
hosts-switcher open --names Dev

# 同时激活多个配置 (自动开启多选模式)
hosts-switcher open --names Dev Test --multi
```

#### 3. 导入导出
```powershell
# 导出全量备份到文件
hosts-switcher export --target ./backup.json

# 导出单个配置 "Dev"
hosts-switcher export --name Dev --target ./dev.txt

# 导入全量备份 (智能识别 .json 后缀)
hosts-switcher import --target ./backup.json

# 导入并立即激活指定环境
# (这会自动覆盖当前配置，并开启多选模式激活 Dev 和 Test)
hosts-switcher import --target ./backup.json --open Dev Test
```

#### 4. 更新公共配置 (Common)
公共配置是所有环境都会生效的基础 Hosts 部分。
```powershell
# 将 common.txt 的内容作为公共配置导入
hosts-switcher import --target ./common.txt
```

## 🛠️ 常见问题

**Q: 双击打不开或提示权限不足？**
A: 程序内置了自提权机制。如果遇到问题，请确保您的 Windows 账户具备管理员资格。首次运行时会有 UAC 弹窗，请点击“是”。

**Q: 命令行执行完为什么弹出了个新窗口就关了？**
A: 这是因为主进程是非管理员启动的，为了获得权限，它启动了一个新的管理员子进程来执行命令。这是正常的 Windows 安全机制。

## 📄 License
MIT

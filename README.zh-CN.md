# specialcodefolding README
vscode插件，能够根据指定的关注点，对代码中所有函数进行特殊的折叠。比如关注点为变量声明语句，这个插件会将代码中所有函数内的除了变量声明语句之外的代码加上删除线。
并且，这个插件能够根据代码生成代码摘要，并对代码语句的重要性进行评估。不同的重要性会使语句被画上不同的颜色。

[English](./README.md) | [中文](./README.zh-CN.md)

[GitHub](https://github.com/WangQianao/vscode-specialcodefolding)

---

## 功能

### 1.基于变量声明语句的折叠
### 2.基于循环控制流的折叠
### 3.基于函数内具体动作的折叠
### 4.基于函数参数的折叠
### 5.基于函数返回值的折叠
### 6.基于异常的折叠
### 7.得到方法的摘要
### 8.根据方法摘要对方法内语句进行重要性评估

---

### 使用方法

#### 折叠（不需要用户手动选择）

<img width="800" src="https://s2.loli.net/2022/11/16/gXJhTmyDY7fuFV3.gif" >


#### 得到方法摘要（需要用户手动选择需要生成摘要的方法）

![3月14日 _1_.gif](https://s2.loli.net/2023/03/14/4YkbKATmGrhQXLM.gif)

---

## 配置

### 基本配置

| Name                 |   Type    | Default                | Description      |
| :------------------- | :-------: | :-------------------:  | :--------------- |
| `codeFolding kind  ` | ` string` | `VariableDeclaration`  | codeFolding kind |

---

### 怎么改变折叠的关注点？
<img width="800" src="https://s2.loli.net/2022/11/16/95KSC1oRVdnbgG3.gif" >

---

## 文件结构

### codeFoldingBackend文件夹存储使用django框架编写的后端，用于对用户选择的代码生成摘要和根据摘要对代码进行重要性评估

### codeFoldingExtension_vscode文件夹存储在vscode端编写插件的代码

---


## 问题

目前插件只支持对**javascript**代码进行折叠

---

## 协议

MIT
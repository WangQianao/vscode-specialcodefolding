# vscode-specialcodefolding


The vscode plugin can perform special folding on all methods in the code according to the specified focus. For example, if the focus is a variable declaration statement, this plugin will add a strikethrough to the code in all methods in the code except for the variable declaration statement.

[English](./README.md) | [中文](./README.zh-CN.md)

[GitHub](https://github.com/WangQianao/vscode-specialcodefolding)

---

## Features

### 1.codeFolding based on VariableDeclaration
### 2.codeFolding based on BranchControl
### 3.codeFolding based on ConcreteAction in Function
### 4.codeFolding based on FunctionParams
### 5.codeFolding based on Returnvalue of Function
### 6.codeFolding based on Exception
### 7.get method summary
### 8.Evaluate the importance of statements within a method based on the method summary

---

### How to use


<img width="800" src="https://s2.loli.net/2022/11/16/gXJhTmyDY7fuFV3.gif" >

---

## Config

### Base Config

| Name                 |   Type    | Default                | Description      |
| :------------------- | :-------: | :-------------------:  | :--------------- |
| `codeFolding kind  ` | ` string` | `VariableDeclaration`  | codeFolding kind |

---

### How to change the focus of the fold


<img width="800" src="https://s2.loli.net/2022/11/16/95KSC1oRVdnbgG3.gif" >

---

## Problem


Currently the plugin only supports folding **javascript** code

---

## LICENSE

MIT

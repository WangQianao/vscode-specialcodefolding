# vscode-specialcodefolding


The vscode plugin can perform special folding on all methods in the code according to the specified focus. For example, if the focus is a variable declaration statement, this plugin will add a strikethrough to the code in all methods in the code except for the variable declaration statement.
Moreover, this plugin can generate a code summary based on the code and evaluate the importance of the code statement. Different importance causes sentences to be painted in different colors.

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
### 8.Evaluate the importance of statements within a method based on the method summary(Rely on deep learning, because there is no GPU server, so can't experience this function yet)

---

### How to flod（Does not require manual selection by the user）


<img width="800" src="https://s2.loli.net/2022/11/16/gXJhTmyDY7fuFV3.gif" >


### How to get the summaryof the method and Evaluate the importance of statements within a method based on the method summary（Requires the user to manually select the method that needs to generate a summary）

![3月14日 _1_.gif](https://s2.loli.net/2023/03/14/4YkbKATmGrhQXLM.gif)



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

## file structure

### The codeFoldingBackend folder stores the backend written using the django framework, which is used to generate a summary of the code selected by the user and evaluate the importance of the code based on the summary

### The codeFoldingExtension_vscode folder stores the code for writing plugin on the vscode side

---

## Problem


Currently the plugin only supports folding **javascript** code

---

## LICENSE

MIT

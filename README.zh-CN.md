# specialcodefolding README
vscode插件，能够根据指定的关注点，对代码中所有函数进行特殊的折叠。比如关注点为变量声明语句，这个插件会将代码中所有函数内的除了变量声明语句之外的代码加上删除线。

## 功能

### 1.基于变量声明语句的折叠
### 2.基于循环控制流的折叠
### 3.基于函数内具体动作的折叠
### 4.基于函数参数的折叠
### 5.基于函数返回值的折叠
### 6.基于异常的折叠


#### 使用方法


<img width="800" src="https://s2.loli.net/2022/11/15/mt54AlHqxZsVk3Q.gif">




## 配置

### 基本配置

| Name                 |   Type    | Default                | Description      |
| :------------------- | :-------: | :-------------------:  | :--------------- |
| `codeFolding kind  ` | ` string` | `VariableDeclaration`  | codeFolding kind |


### 怎么改变折叠的关注点？

<img width="800" src="https://s2.loli.net/2022/11/15/dtgTYMk1y2Nfwaq.gif" >
## 问题

目前插件只支持对**javascript**代码进行折叠，对其他语言的支持正在开发当中

## 协议

MIT
# Vue的MVVM原理
> vue响应式原理最核心的方法是通过`Object.defineProperty()`来实现对属性的劫持，达到监听数据变动的目的。

要实现mvvm的双向绑定，就必须要实现一下几点：
1. 实现一个数据监听Observer，能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者；
2. 实现一个指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令模版替换数据，以及绑定相应的更新函数；
3. 实现一个Watcher，作为连接Observer和Comoile的桥梁，能够订阅并收到每个属性变动的通知，执行指令绑定的相应回调函数，从而更新视图。
4. mvvm入口函数，整合以上三者。
# 实现指令解析器Compile
> 实现一个指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令模版替换数据，以及绑定相应的更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图。
## 初始化
新建MVue.js

使用文档碎片替换页面元素
```javascript
class MVue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    // 保存options参数
    this.$options = options
    // 如果这个根元素存在则开始编译模版
    if (this.$el) {
      // 实现一个指令解析器Compile
      new Compile(this.$el, this)
    }
  }
}

class Compile {
  constructor(el, vm) {
    // 判断el是否是一个元素节点，如果是则直接赋值，如果不是则获取之后再赋值
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    // 因为每次匹配到进行替换时，会导致页面的回流和重绘，影响页面的性能
    // 所以需要创建文档碎片来进行缓存，减少页面的回流和重绘
    // 1.获取文档碎片对象
    const fragment = this.node2Fragment(this.el)
    // 2.编译模版
    // 3.把子元素的所有内容添加到根元素中
    this.el.appendChild(fragment)
  }
  node2Fragment(el) {
    // 创建文档碎片
    const fragment = document.createDocumentFragment()
    let firstChild
    // 循环取到el中的每个元素，添加到文档碎片中
    while(firstChild = el.firstChild) {
      fragment.appendChild(firstChild)
    }
    return fragment
  }
  isElementNode(node) {
    // 判断是否是元素节点
    return node.nodeType === 1
  }
}
```
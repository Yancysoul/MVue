// 定义处理元素、处理文本、处理事件的方法
const compileUtil = {
  // 获取值的方法
  getVal(expr, vm) {
    // return expr.split('.')
    return expr.split('.').reduce((data, currentVal) => {
      return data[currentVal.trim()]
    }, vm.$data)
  },
  getAttrs(expr, vm) {

  },
  // 设置值
  setVal(vm, expr, val) {
    return expr.split('.').reduce((data, currentVal, index, arr) => {
      return data[currentVal] = val
    }, vm.$data)
  },
  // 获取新值  对{{a}} -- {{b}}这种格式进行处理
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm);
    })
  },
  text(node, expr, vm) {
    // expr可能是{{obj.name}}--{{obj.age}}
    let val;
    if (expr.indexOf('{{') !== -1 && expr.indexOf('}}') !== -1) {
      val = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // 绑定watcher从而更新视图
        new Watcher(vm, args[1], () => {
          this.updater.textUpdater(node, this.getContentVal(expr, vm));
        })
        return this.getVal(args[1], vm);
      })
    } else {
      // 可能是v-text='obj.name' v-text='msg'
      val = this.getVal(expr, vm);
    }
    this.updater.textUpdater(node, val);
  },
  html(node, expr, vm) {
    // html处理，直接取值，然后调用更新函数即可
    let val = this.getVal(expr, vm);
    // 订阅数据变化时  绑定watcher，从而更新视图
    new Watcher(vm, expr, newVal => {
      this.updater.htmlUpdater(node, newVal)
    })
    this.updater.htmlUpdater(node, val);
  },
  model(node, expr, vm) {
    const val = this.getVal(expr, vm);
    // 订阅数据时，绑定更新函数  更新视图的变化
    // 数据 ==> 视图
    new Watcher(vm, expr, newVal => {
      this.updater.modelUpdater(node, newVal);
    })
    // 视图 ==> 数据
    node.addEventListener('input', e => {
      // 设置值
      this.setVal(vm, expr, e.target.value);
    })
    this.updater.modelUpdater(node, val);
  },
  on(node, expr, vm, eventName) {
    // 获取事件函数
    const fn = vm.$options.methods && vm.$options.methods[expr];
    // 添加事件，因为使用vue时，都不需要关心this的指向问题，这是因为vue源码做了处理
    node.addEventListener(eventName, fn.bind(vm), false);
  },
  // 绑定属性  只处理简单的属性实现
  bind(node, expr, vm, attrName) {
    const attrVal = this.getVal(expr, vm);
    this.updater.attrUpdater(node, attrName, attrVal);
  },
  updater: {
    textUpdater(node, value) {
      node.textContent = value;
    },
    htmlUpdater(node, value) {
      node.innerHTML = value;
    },
    modelUpdater(node, value) {
      node.value = value;
    },
    attrUpdater(node, attrName, attrVal) {
      node.setAttribute(attrName, attrVal)
    }
  }
}

class MVue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    // 保存options参数
    this.$options = options
    // 如果这个根元素存在则开始编译模版
    if (this.$el) {
      // 1.实现一个数据监听器Observe
      // 能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者
      // Object。definerProperty()来定义
      new Observer(this.$data);
      // 把数据获取操作 vm上的取值操作 都代理到vm.$data上
      this.proxyData(this.$data);
      // 实现一个指令解析器Compile
      new Compile(this.$el, this)
    }
  }
  // 代理
  proxyData(data) {
    for(const key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key];
        },
        set(newVal) {
          data[key] = newVal;
        }
      })
    }
  }
}

class Compile {
  constructor(el, vm) {
    // 判断el是否是一个元素节点，如果是则直接赋值，如果不是则获取之后再赋值
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;
    // 因为每次匹配到进行替换时，会导致页面的回流和重绘，影响页面的性能
    // 所以需要创建文档碎片来进行缓存，减少页面的回流和重绘
    // 1.获取文档碎片对象
    const fragment = this.node2Fragment(this.el);
    // 2.编译模版
    this.compile(fragment);
    // 3.把子元素的所有内容添加到根元素中
    this.el.appendChild(fragment);
  }

  // 编译
  compile(fragment) {
    // 1.获取子节点
    const childNodes = fragment.childNodes;
    // 2.遍历子节点
    [...childNodes].forEach(child => {
      // 3.对子节点的类型进行不同的处理
      if (this.isElementNode(child)) {
        // 是元素节点
        // console.log('元素节点', child);
        this.compileElement(child);
      } else {
        // 是文本节点
        // console.log('文本节点', child);
        this.compileText(child);
      }
      // 4.递归遍历子元素
      if (child.childNodes && child.childNodes.length) {
        this.compile(child)
      }
    })
  }

  // 编译元素的模版
  compileElement(node) {
    // console.log('编译元素');
    // 获取该节点的所有属性
    const attributes = node.attributes;
    [...attributes].forEach(attr => {
      const { name, value } = attr; // 包含v-text、v-model、v-on:click、@click
      // 判断当前那么是否是一个属性
      if (this.isDirective(name)) {
        // 对v-text、v-model、v-html进行操作
        const [, directive] = name.split('-');  // text、model、html、on:click、bind:src...
        // 处理v-bind:src  v-on:click
        const [dirName, eventName] = directive.split(':');
        // 更新数据
        compileUtil[dirName] && compileUtil[dirName](node, value, this.vm, eventName);
        // 移除当前元素中的属性
        node.removeAttribute('v-' + directive);
      } else if (this.isEventName(name)) {
        // 对事件进行处理，在这里处理的是@click
        let [, eventName] = name.split('@');
        compileUtil['on'](node, value, this.vm, eventName);
      }
    })
  }

  // 判断是否是一个指令  即以v-开头
  isDirective(attrName) {
    return attrName.startsWith('v-');
  }

  // 是否是@click这样时间名字
  isEventName(attrName) {
    return attrName.startsWith('@');
  }

  // 编译文本的模版
  compileText(node) {
    // console.log('编译文本');
    const content = node.textContent;
    // 匹配{{ xxx }}的内容
    if (/\{\{(.+?)\}\}/.test(content)) {
      // 处理文本节点
      compileUtil['text'](node, content, this.vm);
    }
  }

  // 转换文档碎片
  node2Fragment(el) {
    // 创建文档碎片
    const fragment = document.createDocumentFragment();
    let firstChild;
    // 循环取到el中的每个元素，添加到文档碎片中
    while(firstChild = el.firstChild) {
      fragment.appendChild(firstChild);
    }
    return fragment;
  }

  // 判断是否是元素节点
  isElementNode(node) {
    // 如果元素的nodeType === 1，则表示该元素是元素节点
    return node.nodeType === 1;
  }
}
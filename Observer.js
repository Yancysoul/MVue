// 实现一个数据监听器Observer，能够对数据对象的所有属性进行监听，如有变动可拿到最新值通知依赖收集对象（Dep）并通知订阅者（Watcher）来更新视图
// 创建一个数据监听器  劫持并监听所有数据的变化
class Observer {
  constructor(data) {
    this.observe(data)
  }
  observe(data) {
    // 如果当前data是一个对象才劫持并监听
    if (data && typeof data === 'object') {
      // 遍历对象的属性做监听
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key])
      })
    }
  }
  defineReactive(obj, key, value) {
    // 循环递归  对所有层的数据进行观察
    this.observe(value);
    const dep = new Dep();
    Object.defineProperty(obj, key, {
      get() {
        // 订阅数据变化，往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set: newVal => {
        if (newVal !== value) {
          // 如果外界直接修改对象，则对新修改的值重新观察
          this.observe(newVal);
          value = newVal;
          // 通知变化
          dep.notify();
        }
      }
    })
  }
}

// 创建Dep  添加订阅者  定义通知的方法
class Dep{
  constructor() {
    this.subs = [];
  }
  // 添加订阅者
  addSub(watcher) {
    this.subs.push(watcher)
  }
  // 通知变化
  notify() {
    // 观察者中有个update方法  来更新视图
    this.subs.forEach(w => w.update())
  }
}

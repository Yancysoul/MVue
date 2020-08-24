/* 
  实现一个Watcher
  它作为连接Observer和Compile的桥梁，能够订阅并收到每个属性变动的通知，执行指令绑定的相应回调函数，从而更新视图
  只要所做事情：
  1、在自身实例化时往属性订阅器（dep）里面添加自己
  2、自身必须有一个update()方法
  3、待属性变动dep.notify()通知时，能调用自身的update()方法，并触发Compile中绑定的回调
*/
class Watcher{
  constructor(vm, expr, cb) {
    // 观察新值和旧值的变化，如果有变化，更新视图
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    // 先把旧值存起来
    this.oldVal = this.getOldVal();
  }
  getOldVal() {
    Dep.target = this;
    let oldVal = compileUtil.getVal(this.expr, this.vm);
    Dep.target = null;
    return oldVal;
  }
  update() {
    // 更新操作，数据变化后，Dep会发生通知，告诉观察者更新视图
    let newVal = compileUtil.getVal(this.expr, this.vm);
    if (newVal !== this.oldVal) {
      this.cb(newVal);
    }
  }
}
import Vue from 'vue'
import App from './App.vue'
import { Button, Row, Col, Header, Main, Footer, Input, Message, Table, TableColumn } from 'element-ui';

Vue.config.productionTip = false
Vue.use(Button)
Vue.use(Row)
Vue.use(Col)
Vue.use(Header)
Vue.use(Main)
Vue.use(Footer)
Vue.use(Input)
Vue.use(Table)
Vue.use(TableColumn)
Vue.prototype.$message = Message

new Vue({
  el: '#app',
  render: h => h(App),
}).$mount('#app')

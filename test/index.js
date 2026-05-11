import {useValidateComponent, RegisterComponent,useContext,useInsert,setContext} from 'pawajs'
import {startApp} from '../index.js'
 RegisterComponent.lazy(
  'App',()=>import('./App.js'),
  'Check',()=>import('./check.js'),
  'Check2',()=>import('./check.js'),
)

const app=`
<div>
  <app>
    <check></check>
    <check-2></check-2>
  </app>
</div>
`
const {toString}=await startApp(app)
console.log(await toString());

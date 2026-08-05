import { SHELL } from "./copy";
export type NavIconName="home"|"book"|"users"|"user"|"play"|"wallet";
export type NavItem={key:string;href:string;label:string;icon:NavIconName;exact?:boolean;sub?:Array<{key:string;href:string;label:string}>};
export const SIDEBAR:NavItem[]=[
 {key:"home",href:"/account/home",label:SHELL.home,icon:"home",exact:true},
 {key:"courses",href:"/courses",label:SHELL.courses,icon:"book",sub:[{key:"enrolled",href:"/library",label:SHELL.myCourses},{key:"quizzes",href:"/quizzes",label:SHELL.questionBank},{key:"homeworks",href:"/homeworks",label:"\u0627\u0644\u0648\u0627\u062c\u0628\u0627\u062a"}]},
 {key:"forum",href:"/community",label:SHELL.forum,icon:"users"},
 {key:"account",href:"/account",label:SHELL.account,icon:"user",exact:true},
 {key:"financial",href:"/account/financial",label:SHELL.financial,icon:"wallet",sub:[{key:"wallet",href:"/account/financial/wallet",label:SHELL.topUp},{key:"methods",href:"/account/financial/methods",label:SHELL.centreCode}]},
 {key:"live",href:"/live",label:SHELL.live,icon:"play"},
];
export type TabItem={key:string;href:string;label:string;exact?:boolean};
export const ACCOUNT_TABS:TabItem[]=[{key:"home",href:"/account/home",label:SHELL.home,exact:true},{key:"results",href:"/account",label:SHELL.results,exact:true},{key:"financial",href:"/account/financial",label:SHELL.financial,exact:true},{key:"wallet",href:"/account/financial/wallet",label:SHELL.topUp},{key:"invoices",href:"/account/financial/invoices",label:SHELL.centreCode},{key:"notifications",href:"/account/notifications",label:SHELL.notifications}];
export function isActive(pathname:string,href:string,exact?:boolean){if(exact)return pathname===href;return pathname===href||pathname.startsWith(`${href}/`);}

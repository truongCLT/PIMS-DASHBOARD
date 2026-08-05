/**
 * Variant C — Warm Earth Tones
 * Warm beige/tan backgrounds, terracotta sidebar, amber accents.
 * Charts unchanged.
 */
import React, { useState } from "react";
import { SalesChart } from "./components/SalesChart";
import { ProfitChart } from "./components/ProfitChart";
import { OrderStatus } from "./components/OrderStatus";
import { CashFlowChart } from "./components/CashFlowChart";
import { PerformanceTable } from "./components/PerformanceTable";
import { CommentPanel } from "./components/CommentPanel";
import { Pin, FolderClosed, ChevronsUp, Download } from "lucide-react";
import "./_group.css";

const BG      = "#f2ece3";
const PANEL   = "#faf6f0";
const SIDEBAR = "#3d2b1f";
const BORDER  = "#d9c9b4";
const ACCENT  = "#c67c3a";
const ACCENT2 = "#8faf6a";
const TEXT    = "#2c1a0e";
const MUTED   = "#8b6f52";
const SIDE_T  = "#f0e0cc";
const SIDE_M  = "#b89070";

const TREE_DATA = [
  { label:"DECV", children:[
    { label:"도급사업", active:true, children:[
      {label:"진행중"},{label:"프로젝트 1"},{label:"프로젝트 2"},
      {label:"완료"},{label:"프로젝트 3"},{label:"프로젝트 4"},
    ]},
    { label:"서비스사업", children:[
      {label:"진행중"},{label:"프로젝트 1"},{label:"프로젝트 2"},
    ]},
  ]},
  { label:"TCC", children:[] },
  { label:"DEHEIM", children:[] },
];

function TreeNode({item,depth=0}:{item:any;depth?:number}) {
  const [open,setOpen]=useState(true);
  const has=item.children&&item.children.length>0;
  const pl=depth===0?"12px":depth===1?"20px":"32px";
  const fw=depth===0?"700":depth===1?"600":"400";
  const fs=depth===0?"12px":"11px";
  const col=depth===0?SIDE_T:depth===1?"#d4b898":SIDE_M;
  return (
    <div>
      <div onClick={()=>has&&setOpen(!open)} style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:`5px 10px 5px ${pl}`,cursor:has?"pointer":"default",
        backgroundColor:item.active?"rgba(198,124,58,0.25)":"transparent",
        color:item.active?ACCENT:col,fontSize:fs,fontWeight:fw,userSelect:"none",
        borderLeft:item.active?`2px solid ${ACCENT}`:"2px solid transparent",
      }}>
        <span>{item.label}</span>
        {has&&<span style={{fontSize:"9px",color:SIDE_M}}>{open?"∧":"∨"}</span>}
      </div>
      {open&&item.children&&item.children.map((c:any,i:number)=>(
        <TreeNode key={i} item={c} depth={depth+1}/>
      ))}
    </div>
  );
}

function Sidebar() {
  return (
    <div style={{width:"170px",minWidth:"170px",backgroundColor:SIDEBAR,
      display:"flex",flexDirection:"column",borderRight:"none"}}>
      <div style={{display:"flex",alignItems:"flex-end",backgroundColor:"#2e1f14",
        padding:"8px 8px 0",gap:"4px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
        <button style={{padding:"5px 12px",backgroundColor:"rgba(198,124,58,0.2)",color:ACCENT,
          border:"1px solid rgba(198,124,58,0.3)",borderBottom:"none",borderRadius:"4px 4px 0 0",
          fontSize:"11px",cursor:"pointer",fontWeight:"700"}}>내 메뉴</button>
        <button style={{padding:"5px 12px",backgroundColor:"transparent",color:SIDE_M,
          border:"1px solid transparent",borderBottom:"none",borderRadius:"4px 4px 0 0",
          fontSize:"11px",cursor:"pointer",fontWeight:"500"}}>메뉴</button>
        <div style={{marginLeft:"auto",paddingBottom:"6px"}}>
          <Pin size={13} color={ACCENT}/>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",
        padding:"10px 12px",color:SIDE_T,fontSize:"12px",fontWeight:"700",
        borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <FolderClosed size={14} color={ACCENT}/>DECV TOTAL
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {TREE_DATA.map((t,i)=><TreeNode key={i} item={t} depth={0}/>)}
      </div>
      <div style={{padding:"12px 10px",borderTop:"1px solid rgba(255,255,255,0.08)",
        fontSize:"10px",color:SIDE_M,textAlign:"center",lineHeight:"1.6"}}>
        <div style={{fontWeight:"700",color:ACCENT,fontSize:"11px"}}>PIMS System</div>
        <div>For DAEWOO E&C VINA</div>
      </div>
    </div>
  );
}

const KPI_COLORS = [ACCENT,"#b85c4a",ACCENT2,"#5b8fa8"];

function KPICard({title,plan,actual,achievement,color}:{title:string;plan:number;actual:number;achievement:string;color:string}) {
  return (
    <div style={{backgroundColor:PANEL,borderRadius:"8px",padding:"12px 16px",
      flex:1,minWidth:0,border:`1px solid ${BORDER}`,
      boxShadow:"0 2px 6px rgba(100,60,20,0.08)"}}>
      <div style={{fontSize:"10px",fontWeight:"700",color:MUTED,marginBottom:"8px",
        textTransform:"uppercase",letterSpacing:"0.06em"}}>{title}</div>
      <div style={{width:"32px",height:"3px",backgroundColor:color,borderRadius:"2px",marginBottom:"10px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        {[["계획",String(plan.toLocaleString()),TEXT],["실적",String(actual.toLocaleString()),TEXT],["달성률",achievement,color]].map(([lbl,val,c])=>(
          <div key={lbl}>
            <div style={{fontSize:"10px",color:MUTED,marginBottom:"3px"}}>{lbl}</div>
            <div style={{fontSize:"clamp(15px,1.4vw,24px)",fontWeight:"700",color:c}}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{background:"linear-gradient(120deg,#e8ddd0 0%,#f0e6d6 40%,#dcd0c0 100%)",
      padding:"14px 18px",borderRadius:"10px",border:`1px solid ${BORDER}`,
      display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h1 style={{color:TEXT,fontSize:"20px",fontWeight:"700",margin:0}}>대시보드</h1>
        <button style={{backgroundColor:PANEL,border:`1px solid ${BORDER}`,borderRadius:"8px",
          padding:"6px 8px",cursor:"pointer",color:ACCENT,display:"flex",alignItems:"center"}}>
          <ChevronsUp size={16}/>
        </button>
      </div>
      <div style={{backgroundColor:PANEL,borderRadius:"8px",border:`1px solid ${BORDER}`,
        padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        {[["프로젝트","All"],["조회 기준","Month"],["통화","USD"]].map(([lbl,val])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{fontSize:"11px",color:MUTED,fontWeight:"600"}}>{lbl}:</span>
            <select style={{border:`1px solid ${BORDER}`,borderRadius:"5px",padding:"4px 10px",
              fontSize:"11px",color:TEXT,backgroundColor:PANEL,cursor:"pointer"}}>
              <option>{val}</option>
            </select>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:MUTED,fontWeight:"600"}}>조회 기간:</span>
          <div style={{border:`1px solid ${BORDER}`,borderRadius:"5px",padding:"4px 10px",
            fontSize:"11px",color:MUTED,backgroundColor:PANEL}}>---------- → ----------</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{fontSize:"11px",color:MUTED}}>단위:</span>
          <div style={{width:"34px",height:"18px",backgroundColor:ACCENT,borderRadius:"9px",position:"relative"}}>
            <div style={{position:"absolute",right:"2px",top:"2px",width:"14px",height:"14px",
              backgroundColor:"#fff",borderRadius:"50%"}}/>
          </div>
          <span style={{fontSize:"11px",color:TEXT,fontWeight:"600"}}>1K USD</span>
          <button style={{display:"flex",alignItems:"center",gap:"5px",backgroundColor:ACCENT,
            color:"#fff",border:"none",borderRadius:"6px",padding:"6px 12px",
            fontSize:"11px",cursor:"pointer",fontWeight:"600"}}>
            <Download size={12}/>다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

export function VariantC() {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",
      fontFamily:"'Noto Sans KR','Inter',sans-serif",backgroundColor:BG}}>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <Sidebar/>
        <div style={{flex:1,overflowY:"auto",backgroundColor:BG,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 10px 0"}}><Header/></div>
          <div style={{padding:"8px 10px 4px",display:"flex",gap:"8px"}}>
            {[
              {title:"당월 매출",plan:1297,actual:2360,achievement:"313%",i:0},
              {title:"당월 영업이익",plan:395,actual:127,achievement:"31%",i:1},
              {title:"누적 매출",plan:1297,actual:2360,achievement:"182%",i:2},
              {title:"누적 영업이익",plan:1297,actual:2360,achievement:"182%",i:3},
            ].map(c=><KPICard key={c.title} title={c.title} plan={c.plan} actual={c.actual} achievement={c.achievement} color={KPI_COLORS[c.i]}/>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:"6px",padding:"4px 10px"}}>
            {[<SalesChart/>,<ProfitChart/>,<OrderStatus/>].map((w,i)=>(
              <div key={i} style={{backgroundColor:PANEL,border:`1px solid ${BORDER}`,borderRadius:"8px",
                padding:"10px 12px",boxShadow:"0 1px 4px rgba(100,60,20,0.06)"}}>{w}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:"6px",padding:"4px 10px 10px"}}>
            {[<CashFlowChart/>,<PerformanceTable/>,<CommentPanel/>].map((w,i)=>(
              <div key={i} style={{backgroundColor:PANEL,border:`1px solid ${BORDER}`,borderRadius:"8px",
                padding:"10px 12px",boxShadow:"0 1px 4px rgba(100,60,20,0.06)"}}>{w}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

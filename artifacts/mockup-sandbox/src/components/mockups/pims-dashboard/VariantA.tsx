/**
 * Variant A — Dark Navy Command
 * Deep dark navy shell, teal accent, high-contrast data.
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

/* ── palette ──────────────────────────────── */
const BG      = "#0b1624";
const PANEL   = "#101f33";
const SIDEBAR = "#080f1c";
const BORDER  = "#1d3050";
const ACCENT  = "#00c9b1";
const TEXT    = "#e2eaf4";
const MUTED   = "#5a7898";
const KPI_BG  = "#152236";

/* ── sidebar ───────────────────────────────── */
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
  const col=depth===0?TEXT:depth===1?"#9ab5d0":MUTED;
  return (
    <div>
      <div onClick={()=>has&&setOpen(!open)} style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:`5px 10px 5px ${pl}`,cursor:has?"pointer":"default",
        backgroundColor:item.active?"#1a3050":"transparent",
        color:col,fontSize:fs,fontWeight:fw,userSelect:"none",
        borderLeft:item.active?`2px solid ${ACCENT}`:"2px solid transparent",
      }}>
        <span>{item.label}</span>
        {has&&<span style={{fontSize:"9px",color:MUTED}}>{open?"∧":"∨"}</span>}
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
      display:"flex",flexDirection:"column",borderRight:`1px solid ${BORDER}`}}>
      <div style={{display:"flex",alignItems:"flex-end",backgroundColor:PANEL,
        padding:"8px 8px 0",gap:"4px",borderBottom:`1px solid ${BORDER}`}}>
        <button style={{padding:"5px 12px",backgroundColor:KPI_BG,color:TEXT,
          border:`1px solid ${BORDER}`,borderBottom:"none",borderRadius:"4px 4px 0 0",
          fontSize:"11px",cursor:"pointer",fontWeight:"600"}}>내 메뉴</button>
        <button style={{padding:"5px 12px",backgroundColor:SIDEBAR,color:ACCENT,
          border:`1px solid ${BORDER}`,borderBottom:"none",borderRadius:"4px 4px 0 0",
          fontSize:"11px",cursor:"pointer",fontWeight:"600"}}>메뉴</button>
        <div style={{marginLeft:"auto",paddingBottom:"6px"}}>
          <Pin size={13} color={ACCENT}/>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",
        padding:"10px 12px",color:TEXT,fontSize:"12px",fontWeight:"700",
        borderBottom:`1px solid ${BORDER}`}}>
        <FolderClosed size={14} color={ACCENT}/>DECV TOTAL
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {TREE_DATA.map((t,i)=><TreeNode key={i} item={t} depth={0}/>)}
      </div>
      <div style={{padding:"12px 10px",borderTop:`1px solid ${BORDER}`,
        fontSize:"10px",color:MUTED,textAlign:"center",lineHeight:"1.5"}}>
        <span style={{color:ACCENT,fontWeight:"700"}}>PIMS System</span><br/>
        <span>For DAEWOO E&C VINA</span>
      </div>
    </div>
  );
}

/* ── KPI cards ─────────────────────────────── */
function KPICard({title,plan,actual,achievement,color="#00c9b1"}:{title:string;plan:number;actual:number;achievement:string;color?:string}) {
  return (
    <div style={{backgroundColor:KPI_BG,borderRadius:"8px",padding:"12px 16px",
      flex:1,minWidth:0,border:`1px solid ${BORDER}`,
      borderTop:`2px solid ${color}`}}>
      <div style={{fontSize:"12px",fontWeight:"600",color:TEXT,marginBottom:"10px"}}>{title}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        {[["계획",String(plan.toLocaleString()),TEXT],["실적",String(actual.toLocaleString()),TEXT],["달성률",achievement,color]].map(([lbl,val,c])=>(
          <div key={lbl}>
            <div style={{fontSize:"10px",color:MUTED,marginBottom:"4px"}}>{lbl}</div>
            <div style={{fontSize:"clamp(16px,1.5vw,28px)",fontWeight:"700",color:c}}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── widget card wrapper ───────────────────── */
function Card({children}:{children:React.ReactNode}) {
  return (
    <div style={{backgroundColor:PANEL,border:`1px solid ${BORDER}`,borderRadius:"6px",
      padding:"10px 12px",overflow:"hidden"}}>
      {children}
    </div>
  );
}

/* ── dashboard header ──────────────────────── */
function Header() {
  return (
    <div style={{background:`linear-gradient(120deg,#0f2240 0%,#152d50 60%,#0b1e38 100%)`,
      padding:"14px 16px",borderRadius:"10px",border:`1px solid ${BORDER}`,
      display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h1 style={{color:TEXT,fontSize:"20px",fontWeight:"700",margin:0}}>대시보드</h1>
        <button style={{backgroundColor:KPI_BG,border:`1px solid ${BORDER}`,borderRadius:"8px",
          padding:"6px 8px",cursor:"pointer",color:ACCENT,display:"flex",alignItems:"center"}}>
          <ChevronsUp size={16}/>
        </button>
      </div>
      <div style={{backgroundColor:KPI_BG,borderRadius:"8px",border:`1px solid ${BORDER}`,
        padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        {[["프로젝트","All"],["조회 기준","Month"],["통화","USD"]].map(([lbl,val])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{fontSize:"11px",color:MUTED,fontWeight:"600"}}>{lbl}:</span>
            <select style={{border:`1px solid ${BORDER}`,borderRadius:"5px",padding:"4px 10px",
              fontSize:"11px",color:TEXT,backgroundColor:"#1a2d47",cursor:"pointer"}}>
              <option>{val}</option>
            </select>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:MUTED,fontWeight:"600"}}>조회 기간:</span>
          <div style={{border:`1px solid ${BORDER}`,borderRadius:"5px",padding:"4px 10px",
            fontSize:"11px",color:MUTED,backgroundColor:"#1a2d47"}}>---------- → ----------</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{fontSize:"11px",color:MUTED}}>단위:</span>
          <div style={{width:"34px",height:"18px",backgroundColor:ACCENT,borderRadius:"9px",position:"relative"}}>
            <div style={{position:"absolute",right:"2px",top:"2px",width:"14px",height:"14px",
              backgroundColor:"#fff",borderRadius:"50%"}}/>
          </div>
          <span style={{fontSize:"11px",color:TEXT,fontWeight:"600"}}>1K USD</span>
          <button style={{display:"flex",alignItems:"center",gap:"5px",backgroundColor:ACCENT,
            color:"#000",border:"none",borderRadius:"6px",padding:"6px 12px",
            fontSize:"11px",cursor:"pointer",fontWeight:"600"}}>
            <Download size={12}/>다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main ───────────────────────────────────── */
export function VariantA() {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",
      fontFamily:"'Noto Sans KR','Inter',sans-serif",backgroundColor:BG}}>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <Sidebar/>
        <div style={{flex:1,overflowY:"auto",backgroundColor:BG,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 10px 0"}}><Header/></div>
          <div style={{padding:"8px 10px 4px",display:"flex",gap:"8px"}}>
            <KPICard title="당월 매출" plan={1297} actual={2360} achievement="313%" color={ACCENT}/>
            <KPICard title="당월 영업이익" plan={395} actual={127} achievement="31%" color="#ff6b6b"/>
            <KPICard title="누적 매출" plan={1297} actual={2360} achievement="182%" color={ACCENT}/>
            <KPICard title="누적 영업이익" plan={1297} actual={2360} achievement="182%" color={ACCENT}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:"6px",padding:"4px 10px"}}>
            <Card><SalesChart/></Card>
            <Card><ProfitChart/></Card>
            <Card><OrderStatus/></Card>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:"6px",padding:"4px 10px 10px"}}>
            <Card><CashFlowChart/></Card>
            <Card><PerformanceTable/></Card>
            <Card><CommentPanel/></Card>
          </div>
        </div>
      </div>
    </div>
  );
}

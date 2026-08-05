/**
 * Variant D — Slate Gradient Modern
 * Dark slate sidebar + gradient header, glassmorphism-style cards, cyan accent.
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

const BG      = "#eef2f8";
const WHITE   = "#ffffff";
const SIDE    = "#1e2d3d";
const SIDE2   = "#17232f";
const BORDER  = "#dce4ef";
const ACCENT  = "#06b6d4";
const ACCENT2 = "#8b5cf6";
const TEXT    = "#0f172a";
const MUTED   = "#64748b";
const SIDE_T  = "#e2ecf6";
const SIDE_M  = "#7090b0";

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
  const col=depth===0?SIDE_T:depth===1?"#b0cce6":SIDE_M;
  return (
    <div>
      <div onClick={()=>has&&setOpen(!open)} style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:`5px 10px 5px ${pl}`,cursor:has?"pointer":"default",
        backgroundColor:item.active?"rgba(6,182,212,0.15)":"transparent",
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
    <div style={{width:"170px",minWidth:"170px",backgroundColor:SIDE,
      display:"flex",flexDirection:"column",borderRight:"none"}}>
      <div style={{display:"flex",alignItems:"flex-end",backgroundColor:SIDE2,
        padding:"8px 8px 0",gap:"4px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <button style={{padding:"5px 12px",backgroundColor:"rgba(6,182,212,0.18)",color:ACCENT,
          border:"1px solid rgba(6,182,212,0.3)",borderBottom:"none",borderRadius:"4px 4px 0 0",
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
        borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <FolderClosed size={14} color={ACCENT}/>DECV TOTAL
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {TREE_DATA.map((t,i)=><TreeNode key={i} item={t} depth={0}/>)}
      </div>
      <div style={{padding:"12px 10px",borderTop:"1px solid rgba(255,255,255,0.06)",
        fontSize:"10px",color:SIDE_M,textAlign:"center",lineHeight:"1.6"}}>
        <div style={{fontWeight:"700",color:ACCENT,fontSize:"11px"}}>PIMS System</div>
        <div>For DAEWOO E&C VINA</div>
      </div>
    </div>
  );
}

const KPI_COLORS=[ACCENT,"#f43f5e",ACCENT2,"#22c55e"];
const KPI_BG=["rgba(6,182,212,0.1)","rgba(244,63,94,0.08)","rgba(139,92,246,0.1)","rgba(34,197,94,0.08)"];

function KPICard({title,plan,actual,achievement,color,bgC}:{title:string;plan:number;actual:number;achievement:string;color:string;bgC:string}) {
  return (
    <div style={{background:`linear-gradient(135deg,${bgC} 0%,${WHITE} 100%)`,
      borderRadius:"10px",padding:"12px 16px",flex:1,minWidth:0,
      border:`1px solid ${BORDER}`,boxShadow:"0 2px 8px rgba(15,23,42,0.06)",
      backdropFilter:"blur(8px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"10px"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:color,
          boxShadow:`0 0 6px ${color}`}}/>
        <div style={{fontSize:"11px",fontWeight:"600",color:MUTED}}>{title}</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        {[["계획",String(plan.toLocaleString()),TEXT],["실적",String(actual.toLocaleString()),TEXT],["달성률",achievement,color]].map(([lbl,val,c])=>(
          <div key={lbl}>
            <div style={{fontSize:"10px",color:MUTED,marginBottom:"3px"}}>{lbl}</div>
            <div style={{fontSize:"clamp(15px,1.4vw,24px)",fontWeight:"800",color:c,
              letterSpacing:"-0.02em"}}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{background:"linear-gradient(120deg,#1e3a5f 0%,#2a4e7c 50%,#1a3050 100%)",
      padding:"14px 18px",borderRadius:"10px",
      display:"flex",flexDirection:"column",gap:"12px",
      boxShadow:"0 4px 16px rgba(15,23,42,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h1 style={{color:WHITE,fontSize:"20px",fontWeight:"700",margin:0,letterSpacing:"-0.02em"}}>대시보드</h1>
          <div style={{width:"32px",height:"2px",background:`linear-gradient(90deg,${ACCENT},transparent)`,
            marginTop:"4px",borderRadius:"1px"}}/>
        </div>
        <button style={{backgroundColor:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:"8px",padding:"6px 8px",cursor:"pointer",color:ACCENT,
          display:"flex",alignItems:"center",backdropFilter:"blur(4px)"}}>
          <ChevronsUp size={16}/>
        </button>
      </div>
      <div style={{backgroundColor:"rgba(255,255,255,0.92)",borderRadius:"8px",border:`1px solid ${BORDER}`,
        padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",
        backdropFilter:"blur(8px)"}}>
        {[["프로젝트","All"],["조회 기준","Month"],["통화","USD"]].map(([lbl,val])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{fontSize:"11px",color:MUTED,fontWeight:"600"}}>{lbl}:</span>
            <select style={{border:`1px solid ${BORDER}`,borderRadius:"5px",padding:"4px 10px",
              fontSize:"11px",color:TEXT,backgroundColor:WHITE,cursor:"pointer"}}>
              <option>{val}</option>
            </select>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:MUTED,fontWeight:"600"}}>조회 기간:</span>
          <div style={{border:`1px solid ${BORDER}`,borderRadius:"5px",padding:"4px 10px",
            fontSize:"11px",color:MUTED,backgroundColor:WHITE}}>---------- → ----------</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{fontSize:"11px",color:MUTED}}>단위:</span>
          <div style={{width:"34px",height:"18px",backgroundColor:ACCENT,borderRadius:"9px",position:"relative",
            boxShadow:`0 0 8px ${ACCENT}60`}}>
            <div style={{position:"absolute",right:"2px",top:"2px",width:"14px",height:"14px",
              backgroundColor:WHITE,borderRadius:"50%"}}/>
          </div>
          <span style={{fontSize:"11px",color:TEXT,fontWeight:"600"}}>1K USD</span>
          <button style={{display:"flex",alignItems:"center",gap:"5px",
            background:`linear-gradient(135deg,${ACCENT},#0891b2)`,
            color:WHITE,border:"none",borderRadius:"6px",padding:"6px 12px",
            fontSize:"11px",cursor:"pointer",fontWeight:"600",
            boxShadow:`0 2px 8px ${ACCENT}50`}}>
            <Download size={12}/>다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

export function VariantD() {
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
            ].map(c=><KPICard key={c.title} title={c.title} plan={c.plan} actual={c.actual} achievement={c.achievement} color={KPI_COLORS[c.i]} bgC={KPI_BG[c.i]}/>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:"6px",padding:"4px 10px"}}>
            {[<SalesChart/>,<ProfitChart/>,<OrderStatus/>].map((w,i)=>(
              <div key={i} style={{backgroundColor:WHITE,border:`1px solid ${BORDER}`,borderRadius:"8px",
                padding:"10px 12px",boxShadow:"0 2px 6px rgba(15,23,42,0.05)"}}>{w}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:"6px",padding:"4px 10px 10px"}}>
            {[<CashFlowChart/>,<PerformanceTable/>,<CommentPanel/>].map((w,i)=>(
              <div key={i} style={{backgroundColor:WHITE,border:`1px solid ${BORDER}`,borderRadius:"8px",
                padding:"10px 12px",boxShadow:"0 2px 6px rgba(15,23,42,0.05)"}}>{w}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

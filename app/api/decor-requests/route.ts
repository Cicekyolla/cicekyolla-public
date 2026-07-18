import { NextRequest, NextResponse } from "next/server";
const API=process.env.NEXT_PUBLIC_API_ORIGIN??"https://cicekyolla-api.onrender.com";
export async function POST(req:NextRequest){try{const r=await fetch(`${API}/api/public/decoration-leads`,{method:"POST",headers:{"Content-Type":"application/json"},body:await req.text(),cache:"no-store"});return new NextResponse(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}})}catch{return NextResponse.json({error:"Talep servisine ulaşılamadı"},{status:502})}}

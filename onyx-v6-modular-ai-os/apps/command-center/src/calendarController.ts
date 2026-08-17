import{analyzeCalendar,composeCalendarSpeech,type CalendarEventRecord,type CalendarSummary}from"@onyx/calendar-intelligence";import{getMicrosoftAccessToken}from"./workspaceController";
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kolkata";const startOf=(offset:number)=>{const d=new Date();d.setDate(d.getDate()+offset);d.setHours(0,0,0,0);return d};const endOf=(offset:number)=>{const d=startOf(offset);d.setDate(d.getDate()+1);return d};
export async function loadCalendar(offset=0):Promise<CalendarSummary>{const token=await getMicrosoftAccessToken(["Calendars.Read"]);const start=startOf(offset),end=endOf(offset);const url=new URL("https://graph.microsoft.com/v1.0/me/calendar/calendarView");url.searchParams.set("startDateTime",start.toISOString());url.searchParams.set("endDateTime",end.toISOString());url.searchParams.set("$select","id,subject,start,end,isAllDay,isCancelled,showAs,location,organizer,isOnlineMeeting,onlineMeeting,onlineMeetingUrl,sensitivity");url.searchParams.set("$orderby","start/dateTime");let next:string|undefined=url.toString();const events:CalendarEventRecord[]=[];while(next&&events.length<250){const r=await fetch(next,{headers:{Authorization:`Bearer ${token}`,Prefer:`outlook.timezone=\"${zone}\"`}});if(!r.ok){
  const requestId=
    r.headers.get("request-id")??
    r.headers.get("client-request-id")??
    undefined;

  if(r.status===401){
    throw new Error(
      "Microsoft Calendar authorization is invalid or expired. Reconnect Microsoft and retry."
    );
  }

  if(r.status===403){
    throw new Error(
      "Microsoft Calendar permission is missing or blocked. Grant Calendars.Read and reconnect Microsoft."
    );
  }

  if(r.status===404){
    throw new Error(
      "Microsoft Calendar or the associated mailbox was not found."
    );
  }

  if(r.status===429){
    const retryAfter=r.headers.get("Retry-After");
    throw new Error(
      retryAfter
        ? `Microsoft Calendar is temporarily throttled. Retry after ${retryAfter} seconds.`
        : "Microsoft Calendar is temporarily throttled. Wait briefly and retry."
    );
  }

  throw new Error(
    `Microsoft Calendar request failed (${r.status})${
      requestId?` [request ${requestId}]`:""
    }.`
  );
}const j=await r.json();for(const e of j.value??[])events.push({id:e.id,subject:e.sensitivity==="private"&&!e.subject?"Private appointment":e.subject||"Untitled event",start:e.start.dateTime,end:e.end.dateTime,isAllDay:e.isAllDay,isCancelled:e.isCancelled,showAs:e.showAs,location:e.location?.displayName,organizer:e.organizer?.emailAddress?.name,isOnlineMeeting:Boolean(e.isOnlineMeeting),joinUrl:e.onlineMeeting?.joinUrl??e.onlineMeetingUrl,sensitivity:e.sensitivity});next=j["@odata.nextLink"];}return analyzeCalendar(events,offset===0?"today":"tomorrow",zone,start,end,new Date())}
export{composeCalendarSpeech};

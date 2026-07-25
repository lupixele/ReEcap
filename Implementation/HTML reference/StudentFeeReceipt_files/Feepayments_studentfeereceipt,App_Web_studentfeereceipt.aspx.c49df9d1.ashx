
// cached javascript
var Feepayments_studentfeereceipt = {
FillStudentFees_Old:function(rollno,amount,receiptdate,callback,context){return new ajax_request(this.url + '?_method=FillStudentFees_Old&_session=rw','rollno=' + enc(rollno)+ '\r\namount=' + enc(amount)+ '\r\nreceiptdate=' + enc(receiptdate),callback, context);},
FillStudentFees_PaytmOld:function(callback,context){return new ajax_request(this.url + '?_method=FillStudentFees_PaytmOld&_session=rw','',callback, context);},
FillStudentFees:function(callback,context){return new ajax_request(this.url + '?_method=FillStudentFees&_session=rw','',callback, context);},
SaveFeeReceipt:function(studentid,arrfeedueslno,arramount,arrfine,arrrevenueid,arrsemesterid,miscamount,arrencdata,arrencfinedata,arrencfinep,payfrom,studentmobile,callback,context){return new ajax_request(this.url + '?_method=SaveFeeReceipt&_session=r','studentid=' + enc(studentid)+ '\r\narrfeedueslno=' + enc(arrfeedueslno)+ '\r\narramount=' + json_from_object(arramount)+ '\r\narrfine=' + json_from_object(arrfine)+ '\r\narrrevenueid=' + enc(arrrevenueid)+ '\r\narrsemesterid=' + enc(arrsemesterid)+ '\r\nmiscamount=' + enc(miscamount)+ '\r\narrencdata=' + json_from_object(arrencdata)+ '\r\narrencfinedata=' + json_from_object(arrencfinedata)+ '\r\narrencfinep=' + json_from_object(arrencfinep)+ '\r\npayfrom=' + enc(payfrom)+ '\r\nstudentmobile=' + enc(studentmobile),callback, context);},
CheckFeeFinePercent:function(encfeepercent,finepercent,callback,context){return new ajax_request(this.url + '?_method=CheckFeeFinePercent&_session=r','encfeepercent=' + enc(encfeepercent)+ '\r\nfinepercent=' + enc(finepercent),callback, context);},
url:'/aus/ajax/Feepayments_studentfeereceipt,App_Web_studentfeereceipt.aspx.c49df9d1.ashx'
}
function HtmlControl(id) {
	var ele = null;
	if(typeof(id) == 'object') ele = id; else ele = document.getElementById(id);
	if(ele == null) return null;
	var _o = ele.cloneNode(true);
	var _op = document.createElement('SPAN');
	_op.appendChild(_o);	
	this._source = _op.innerHTML;
}
HtmlControl.prototype.toString = function(){ return this._source; }

function HtmlControlUpdate(func, parentId) {
var f,i,ff,fa='';
var ele = document.getElementById(parentId);
if(ele == null) return;
var args = [];
for(i=0; i<HtmlControlUpdate.arguments.length; i++)
	args[args.length] = HtmlControlUpdate.arguments[i];
if(args.length > 2)
	for(i=2; i<args.length; i++){fa += 'args[' + i + ']';if(i < args.length -1){ fa += ','; }}
f = '{"invoke":function(args){return ' + func + '(' + fa + ');}}';
ff = null;eval('ff=' + f + ';');
if(ff != null && typeof(ff.invoke) == 'function')
{
	var res = ff.invoke(args);
	if(res.error != null){alert(res.error);return;}
	ele.innerHTML = res.value;
}
}
function digi(v, c){v = v + "";var n = "0000";if(v.length < c) return n.substr(0, c-v.length) + v;return v;}
function DateTime(year,month,day,hours,minutes,seconds){if(year>9999||year<1970||month<1||month>12||day<0||day>31||hours<0||hours>23||minutes<0||minutes>59||seconds<0||seconds>59)throw("ArgumentException");this.Year = year;this.Month = month;this.Day = day;this.Hours = hours;this.Minutes = minutes;this.Seconds = seconds;}
DateTime.prototype.toString = function(){return digi(this.Year,4) + digi(this.Month,2) + digi(this.Day,2) + digi(this.Hours,2) + digi(this.Minutes,2) + digi(this.Seconds,2);}
function AjaxImage(url){var img=new Image();img.src=url;return img;}
function TimeSpan(){this.Days=0;this.Hours=0;this.Minutes=0;this.Seconds=0;this.Milliseconds=0;}
TimeSpan.prototype.toString = function(){return this.Days+'.'+this.Hours+':'+this.Minutes+':'+this.Seconds+'.'+this.Milliseconds;}
function _getTable(n,e){for(var i=0; i<e.Tables.length; i++){if(e.Tables[i].Name == n)return e.Tables[i];}return null;}

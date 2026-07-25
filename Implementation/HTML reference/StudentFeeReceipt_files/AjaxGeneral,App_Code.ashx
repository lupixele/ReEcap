
// cached javascript
var AjaxGeneral = {
GetDates:function(callback,context){return new ajax_request(this.url + '?_method=GetDates&_session=no','',callback, context);},
FillAccounts:function(callback,context){return new ajax_request(this.url + '?_method=FillAccounts&_session=no','',callback, context);},
ArrDateValues:function(callback,context){return new ajax_request(this.url + '?_method=ArrDateValues&_session=no','',callback, context);},
LoadCourses:function(controlid,onchangemethod,isdefaultall,callback,context){return new ajax_request(this.url + '?_method=LoadCourses&_session=no','controlid=' + enc(controlid)+ '\r\nonchangemethod=' + enc(onchangemethod)+ '\r\nisdefaultall=' + enc(isdefaultall),callback, context);},
LoadBranchAndSemestersDropDown:function(courseid,branchcontrolid,branchonchangemethod,branchdefaultall,semestercontrolid,semesteronchangemethod,semesterdefaultall,callback,context){return new ajax_request(this.url + '?_method=LoadBranchAndSemestersDropDown&_session=no','courseid=' + enc(courseid)+ '\r\nbranchcontrolid=' + enc(branchcontrolid)+ '\r\nbranchonchangemethod=' + enc(branchonchangemethod)+ '\r\nbranchdefaultall=' + enc(branchdefaultall)+ '\r\nsemestercontrolid=' + enc(semestercontrolid)+ '\r\nsemesteronchangemethod=' + enc(semesteronchangemethod)+ '\r\nsemesterdefaultall=' + enc(semesterdefaultall),callback, context);},
LoadBranchAndSemestersCheckList:function(courseid,callback,context){return new ajax_request(this.url + '?_method=LoadBranchAndSemestersCheckList&_session=no','courseid=' + enc(courseid),callback, context);},
ShowStudents_SessionalMarks:function(subjectid,sectionid,sesssionid,reporttype,callFrom,allownew,allowedit,callback,context){return new ajax_request(this.url + '?_method=ShowStudents_SessionalMarks&_session=no','subjectid=' + enc(subjectid)+ '\r\nsectionid=' + enc(sectionid)+ '\r\nsesssionid=' + enc(sesssionid)+ '\r\nreporttype=' + enc(reporttype)+ '\r\ncallFrom=' + enc(callFrom)+ '\r\nallownew=' + enc(allownew)+ '\r\nallowedit=' + enc(allowedit),callback, context);},
SaveSessionalMarks:function(subjectid,sessionid,examdate,submitstatus,serialno,tablename,arrrollno,arrstudentid,arrprimarykeyno,arrexamid,arrmarks,arroutcomeslno,arroutcomekeyno,arroutcomevalue,arrknowledgevalue,callback,context){return new ajax_request(this.url + '?_method=SaveSessionalMarks&_session=no','subjectid=' + enc(subjectid)+ '\r\nsessionid=' + enc(sessionid)+ '\r\nexamdate=' + enc(examdate)+ '\r\nsubmitstatus=' + enc(submitstatus)+ '\r\nserialno=' + enc(serialno)+ '\r\ntablename=' + enc(tablename)+ '\r\narrrollno=' + json_from_object(arrrollno)+ '\r\narrstudentid=' + enc(arrstudentid)+ '\r\narrprimarykeyno=' + enc(arrprimarykeyno)+ '\r\narrexamid=' + enc(arrexamid)+ '\r\narrmarks=' + json_from_object(arrmarks)+ '\r\narroutcomeslno=' + enc(arroutcomeslno)+ '\r\narroutcomekeyno=' + enc(arroutcomekeyno)+ '\r\narroutcomevalue=' + enc(arroutcomevalue)+ '\r\narrknowledgevalue=' + enc(arrknowledgevalue),callback, context);},
ShowLocations:function(parentid,loctype,callback,context){return new ajax_request(this.url + '?_method=ShowLocations&_session=no','parentid=' + enc(parentid)+ '\r\nloctype=' + enc(loctype),callback, context);},
GetExamsHeldData:function(fixstatus,callback,context){return new ajax_request(this.url + '?_method=GetExamsHeldData&_session=r','fixstatus=' + enc(fixstatus),callback, context);},
GetExamsHeldDataBySemester:function(SemesterId,isall,callback,context){return new ajax_request(this.url + '?_method=GetExamsHeldDataBySemester&_session=r','SemesterId=' + enc(SemesterId)+ '\r\nisall=' + enc(isall),callback, context);},
GetSubjectsByExamHeld:function(heldserialno,branchid,subjecttype,callback,context){return new ajax_request(this.url + '?_method=GetSubjectsByExamHeld&_session=r','heldserialno=' + enc(heldserialno)+ '\r\nbranchid=' + enc(branchid)+ '\r\nsubjecttype=' + enc(subjecttype),callback, context);},
FillStudentExamHeldDetails:function(callback,context){return new ajax_request(this.url + '?_method=FillStudentExamHeldDetails&_session=r','',callback, context);},
FillRevaluationSubjects:function(rollno,transtype,allownew,heldserialno,callback,context){return new ajax_request(this.url + '?_method=FillRevaluationSubjects&_session=r','rollno=' + enc(rollno)+ '\r\ntranstype=' + enc(transtype)+ '\r\nallownew=' + enc(allownew)+ '\r\nheldserialno=' + enc(heldserialno),callback, context);},
SaveRevaluation:function(studentid,transtype,regdate,arrsubjectid,arrheldserialno,amountpersubject,lastdate,refno,arrencvalue,callback,context){return new ajax_request(this.url + '?_method=SaveRevaluation&_session=r','studentid=' + enc(studentid)+ '\r\ntranstype=' + enc(transtype)+ '\r\nregdate=' + enc(regdate)+ '\r\narrsubjectid=' + enc(arrsubjectid)+ '\r\narrheldserialno=' + enc(arrheldserialno)+ '\r\namountpersubject=' + json_from_object(amountpersubject)+ '\r\nlastdate=' + enc(lastdate)+ '\r\nrefno=' + enc(refno)+ '\r\narrencvalue=' + json_from_object(arrencvalue),callback, context);},
SaveRevaluation_OnLine:function(studentid,transtype,regdate,arrsubjectid,arrheldserialno,amountpersubject,lastdate,refno,arrencvalue,heldserialno,mobile,email,callback,context){return new ajax_request(this.url + '?_method=SaveRevaluation_OnLine&_session=r','studentid=' + enc(studentid)+ '\r\ntranstype=' + enc(transtype)+ '\r\nregdate=' + enc(regdate)+ '\r\narrsubjectid=' + enc(arrsubjectid)+ '\r\narrheldserialno=' + enc(arrheldserialno)+ '\r\namountpersubject=' + json_from_object(amountpersubject)+ '\r\nlastdate=' + enc(lastdate)+ '\r\nrefno=' + enc(refno)+ '\r\narrencvalue=' + json_from_object(arrencvalue)+ '\r\nheldserialno=' + enc(heldserialno)+ '\r\nmobile=' + enc(mobile)+ '\r\nemail=' + enc(email),callback, context);},
FillRevaluationAppliedSubjects:function(heldserialno,callback,context){return new ajax_request(this.url + '?_method=FillRevaluationAppliedSubjects&_session=no','heldserialno=' + enc(heldserialno),callback, context);},
FillInternalExamNames:function(format,callback,context){return new ajax_request(this.url + '?_method=FillInternalExamNames&_session=no','format=' + enc(format),callback, context);},
ShowSubjects:function(courseid,branchid,semesterid,callback,context){return new ajax_request(this.url + '?_method=ShowSubjects&_session=r','courseid=' + enc(courseid)+ '\r\nbranchid=' + enc(branchid)+ '\r\nsemesterid=' + enc(semesterid),callback, context);},
GetSectionsByExam:function(heldserialno,branchid,callback,context){return new ajax_request(this.url + '?_method=GetSectionsByExam&_session=r','heldserialno=' + enc(heldserialno)+ '\r\nbranchid=' + enc(branchid),callback, context);},
FillExaminerSubjects:function(heldserialno,usertype,callback,context){return new ajax_request(this.url + '?_method=FillExaminerSubjects&_session=r','heldserialno=' + enc(heldserialno)+ '\r\nusertype=' + enc(usertype),callback, context);},
ShowLabSubjectStudents:function(serialno,subjectid,section,usertype,callback,context){return new ajax_request(this.url + '?_method=ShowLabSubjectStudents&_session=r','serialno=' + enc(serialno)+ '\r\nsubjectid=' + enc(subjectid)+ '\r\nsection=' + enc(section)+ '\r\nusertype=' + enc(usertype),callback, context);},
SaveLabExaminerMarks:function(serialno,arrstudentid,arrmarks,savefrom,coursetype,callback,context){return new ajax_request(this.url + '?_method=SaveLabExaminerMarks&_session=r','serialno=' + enc(serialno)+ '\r\narrstudentid=' + enc(arrstudentid)+ '\r\narrmarks=' + json_from_object(arrmarks)+ '\r\nsavefrom=' + enc(savefrom)+ '\r\ncoursetype=' + enc(coursetype),callback, context);},
FreezeExaminerLabMarks:function(serialno,usertype,callback,context){return new ajax_request(this.url + '?_method=FreezeExaminerLabMarks&_session=r','serialno=' + enc(serialno)+ '\r\nusertype=' + enc(usertype),callback, context);},
GenerateExternalLabMarksReport:function(arrdata,examname,heldserialno,callback,context){return new ajax_request(this.url + '?_method=GenerateExternalLabMarksReport&_session=r','arrdata=' + json_from_object(arrdata)+ '\r\nexamname=' + enc(examname)+ '\r\nheldserialno=' + enc(heldserialno),callback, context);},
GetExamSchedules:function(CourseId,SemesterId,callback,context){return new ajax_request(this.url + '?_method=GetExamSchedules&_session=no','CourseId=' + enc(CourseId)+ '\r\nSemesterId=' + enc(SemesterId),callback, context);},
GetSeatingPlanRooms:function(scheduleid,SemesterId,callback,context){return new ajax_request(this.url + '?_method=GetSeatingPlanRooms&_session=no','scheduleid=' + enc(scheduleid)+ '\r\nSemesterId=' + enc(SemesterId),callback, context);},
url:'/aus/ajax/AjaxGeneral,App_Code.ashx'
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

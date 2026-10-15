use hennery_host::{AgentCommand, delegation::{CatalogProbes, checked_cwd, security_classification}, outbox::Outbox, profile::Profile, session::{self, Attach, Launch, SessionCmd, SessionOptions}, uplink::Uplink};
use hennery_proto::{delegation_host::{ConfigCompleteness, PromptFence}, frames::{ConfigValue, HostFrame, SessionBody, SessionConfig}};
use hennery_testkit::{FakeScript, SCRIPT_ENV, sample_config_options};
use serde_json::json;
use std::{path::Path, time::Duration};

fn fake(script: FakeScript, root: &Path) -> AgentCommand {
    let program = env!("CARGO_BIN_EXE_hennery-fake-acp");
    hennery_testkit::first_exec(program);
    AgentCommand { program: program.into(), args: vec![], env: vec![
        (SCRIPT_ENV.into(), serde_json::to_string(&script).unwrap()),
        ("HOME".into(), root.display().to_string()),
        ("XDG_CONFIG_HOME".into(), root.display().to_string()),
        ("XDG_DATA_HOME".into(), root.display().to_string()),
        ("XDG_CACHE_HOME".into(), root.display().to_string()),
        ("SSL_CERT_FILE".into(), String::new()),
        ("SSL_CERT_DIR".into(), String::new()),
    ] }
}
fn script() -> FakeScript { FakeScript { config_options: sample_config_options(), ..Default::default() } }
async fn until(up: &Uplink, pred: impl Fn(&[HostFrame]) -> bool) -> Vec<HostFrame> {
    tokio::time::timeout(Duration::from_secs(20), async { loop { let f=up.pending().unwrap(); if pred(&f) { return f; } tokio::time::sleep(Duration::from_millis(10)).await; } }).await.expect("host fact")
}
fn evidence(f: &[HostFrame]) -> hennery_proto::delegation_host::ConfigEvidence {
    f.iter().rev().find_map(|f| match f {
        HostFrame::Session { body: SessionBody::SessionStarted { indexed, .. } | SessionBody::ConfigApplied { indexed, .. } | SessionBody::AcpUpdate { indexed, .. }, .. } => indexed.config_evidence.clone(), _ => None
    }).expect("generation-bound evidence")
}
fn launch(root: &Path, script: FakeScript, attach: Attach) -> Launch { Launch { request_id:"start".into(),session_id:"s".into(),attach,config:SessionConfig::default(),agent:fake(script,root),cwd:root.into(),profile:Profile::Generic,mcp_servers:vec![] } }
fn prompt(expected:PromptFence, request:&str) -> SessionCmd { SessionCmd::FencedPrompt {request_id:request.into(),turn_id:request.into(),content:vec![json!({"type":"text","text":"brief"})],expected} }
async fn stop(handle:session::SessionHandle) { handle.send(SessionCmd::Close {request_id:"close".into()});handle.finished().await; }

#[test]
fn workspace_fence_rejects_outside_and_symlink_swap() {
    let root=tempfile::tempdir().unwrap();let outside=tempfile::tempdir().unwrap();let cwd=root.path().canonicalize().unwrap();
    assert_eq!(checked_cwd(cwd.to_str().unwrap(), &[cwd.clone()]).unwrap(),cwd);
    assert!(checked_cwd(outside.path().canonicalize().unwrap().to_str().unwrap(), &[cwd.clone()]).is_err());
    assert!(checked_cwd(cwd.to_str().unwrap(), &[]).is_err());
    std::os::unix::fs::symlink(outside.path(),cwd.join("swapped")).unwrap();
    assert!(checked_cwd(cwd.join("swapped").to_str().unwrap(), &[cwd]).is_err());
}
#[test]
fn security_is_profile_bound_and_never_authorizes_bypass() {
    let safe=security_classification(Profile::Claude);
    assert!(safe.known);assert!(safe.axes["mode"].contains(&ConfigValue::Id("default".into())));
    assert!(!safe.axes["mode"].contains(&ConfigValue::Id("bypassPermissions".into())));
    assert!(!security_classification(Profile::Generic).known);
    assert!(!security_classification(Profile::ClaudeOwnCli).known);
}
#[tokio::test]
async fn cold_catalog_uses_selected_adapter_without_prompt_or_mcp() {
    let root=tempfile::tempdir().unwrap();let cwd=root.path().canonicalize().unwrap();let log=cwd.join("sessions");
    let mut s=script();s.session_log=Some(log.display().to_string());s.prompt_error=Some("no prompt allowed".into());
    let probes=CatalogProbes::new(1,Duration::from_secs(10));
    let result=probes.catalog("chosen",fake(s,&cwd),Profile::Claude,cwd.clone(),vec![cwd.clone()]).await.unwrap();
    assert_eq!(result.agent,"chosen");assert_eq!(result.defaults.model.as_deref(),Some("small"));assert!(!result.adapter_revision.is_empty());
    let requests=std::fs::read_to_string(log).unwrap();let first:serde_json::Value=serde_json::from_str(requests.lines().next().unwrap()).unwrap();
    assert_eq!(first["params"]["mcpServers"],json!([]));assert_eq!(requests.lines().count(),1);
}
#[tokio::test]
async fn catalog_timeout_releases_permit_and_leaves_no_adapter() {
    let root=tempfile::tempdir().unwrap();let cwd=root.path().canonicalize().unwrap();
    let probes=CatalogProbes::new(1,Duration::from_millis(100));
    let hanging=AgentCommand {program:"sh".into(),args:vec!["-c".into(),"exec sleep 100".into()],env:vec![]};
    assert!(probes.catalog("hang",hanging,Profile::Generic,cwd.clone(),vec![cwd.clone()]).await.is_err());
    let probes=CatalogProbes::new(1,Duration::from_secs(10));
    assert!(probes.catalog("fine",fake(script(),&cwd),Profile::Generic,cwd.clone(),vec![cwd]).await.is_ok());
}
#[tokio::test]
async fn fresh_attach_evidence_admits_matching_prompt_and_rejects_stale_generation() {
    let root=tempfile::tempdir().unwrap();let (up,mut replies)=Uplink::new(Outbox::open_in_memory().unwrap());
    let h=session::launch_delegated(up.clone(),launch(root.path(),script(),Attach::New),SessionOptions::default(),9);
    let f=until(&up,|f|!f.is_empty()).await;let ev=evidence(&f);assert_eq!(ev.attach_generation,9);assert_eq!(ev.completeness,ConfigCompleteness::Complete);
    h.send(prompt(PromptFence {attach_generation:8,config_revision:ev.config_revision},"stale"));
    assert!(matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence"));
    h.send(prompt(PromptFence {attach_generation:9,config_revision:ev.config_revision},"fresh"));
    until(&up,|f|f.iter().any(|f|matches!(f,HostFrame::Session{body:SessionBody::TurnEnded{..},..}))).await;stop(h).await;
}
#[tokio::test]
async fn no_resume_readback_is_not_old_configuration_evidence() {
    let root=tempfile::tempdir().unwrap();let (up,mut replies)=Uplink::new(Outbox::open_in_memory().unwrap());
    let mut s=script();s.config_in_update_only=true;
    let h=session::launch_delegated(up.clone(),launch(root.path(),s,Attach::Load {agent_session_id:"old".into()}),SessionOptions::default(),12);
    let ev=evidence(&until(&up,|f|!f.is_empty()).await);assert_ne!(ev.completeness,ConfigCompleteness::Complete);
    h.send(prompt(PromptFence{attach_generation:12,config_revision:ev.config_revision},"held"));
    assert!(matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence"));stop(h).await;
}
#[tokio::test]
async fn switch_in_flight_fences_prompt_then_new_readback_repairs() {
    let root=tempfile::tempdir().unwrap();let marker=root.path().join("answer");let log=root.path().join("switches");
    let mut s=script();s.model_switch_answer_on_file=Some(marker.display().to_string());s.config_log=Some(log.display().to_string());
    let (up,mut replies)=Uplink::new(Outbox::open_in_memory().unwrap());let h=session::launch_delegated(up.clone(),launch(root.path(),s,Attach::New),SessionOptions::default(),2);
    let ev=evidence(&until(&up,|f|!f.is_empty()).await);
    h.send(SessionCmd::SetConfig{request_id:"switch".into(),config_id:"model".into(),value:ConfigValue::Id("large".into())});
    tokio::time::timeout(Duration::from_secs(10),async{while !log.exists(){tokio::time::sleep(Duration::from_millis(10)).await}}).await.unwrap();
    h.send(prompt(PromptFence{attach_generation:2,config_revision:ev.config_revision},"old"));
    assert!(matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence"));
    std::fs::write(marker,"").unwrap();let f=until(&up,|f|f.iter().any(|f|matches!(f,HostFrame::Session{body:SessionBody::ConfigApplied{..},..}))).await;
    let new=evidence(&f);assert!(new.config_revision>ev.config_revision);assert_eq!(new.actual.model.as_deref(),Some("large"));
    h.send(prompt(PromptFence{attach_generation:2,config_revision:new.config_revision},"repaired"));
    until(&up,|f|f.iter().any(|f|matches!(f,HostFrame::Session{body:SessionBody::TurnEnded{..},..}))).await;stop(h).await;
}
#[tokio::test]
async fn failed_or_empty_reapply_never_produces_complete_evidence() {
    for empty in [false,true] {
        let root=tempfile::tempdir().unwrap();let (up,mut replies)=Uplink::new(Outbox::open_in_memory().unwrap());
        let mut s=script();s.empty_config_read_back=empty;if !empty {s.config_in_update_only=true;s.config_error=Some("cannot reapply".into());}
        let mut launch=launch(root.path(),s,Attach::Load{agent_session_id:"old".into()});launch.config.model=Some("large".into());
        let h=session::launch_delegated(up.clone(),launch,SessionOptions::default(),4);
        let ev=evidence(&until(&up,|f|!f.is_empty()).await);assert_ne!(ev.completeness,ConfigCompleteness::Complete);assert!(ev.actual.is_empty());
        h.send(prompt(PromptFence{attach_generation:4,config_revision:ev.config_revision},"held"));
        assert!(matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence"));stop(h).await;
    }
}
#[tokio::test]
async fn independent_config_notification_advances_fence() {
    let root=tempfile::tempdir().unwrap();let (up,mut replies)=Uplink::new(Outbox::open_in_memory().unwrap());let mut s=script();s.prompt_sets_mode=Some("bypass".into());
    let h=session::launch_delegated(up.clone(),launch(root.path(),s,Attach::New),SessionOptions::default(),7);
    let ev=evidence(&until(&up,|f|!f.is_empty()).await);let old=PromptFence{attach_generation:7,config_revision:ev.config_revision};h.send(prompt(old.clone(),"first"));
    let f=until(&up,|f|f.iter().any(|f|matches!(f,HostFrame::Session{body:SessionBody::TurnEnded{..},..}))).await;let current=evidence(&f);
    assert!(current.config_revision>ev.config_revision);assert_eq!(current.actual.mode.as_deref(),Some("bypass"));h.send(prompt(old,"late"));
    assert!(matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence"));stop(h).await;
}

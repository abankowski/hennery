// One native packaged-CLI install replaces the seven-crate macOS repetition.
import fs from 'node:fs';
import {join, resolve} from 'node:path';
import {registry} from './crate-registry.mjs';
import {readJSON, verifyCandidate} from './crate-release.mjs';
import {run} from './prepare-crates.mjs';
const candidate=resolve(process.argv[2]), work=resolve(process.argv[3]);
const inventory=readJSON(join(candidate,'crates-inventory.json'));
verifyCandidate(candidate,inventory);
fs.mkdirSync(work);
const local=await registry(join(work,'registry-cache'));
const cargoHome=join(work,'cargo-home');fs.mkdirSync(cargoHome);
fs.writeFileSync(join(cargoHome,'config.toml'),`[source.crates-io]\nreplace-with="candidate"\n[source.candidate]\nregistry="${local.url}"\n`);
const env={...process.env,CARGO_HOME:cargoHome,CARGO_TARGET_DIR:join(work,'target'),HENNERY_WEB_DIST:'',HENNERY_WEB_REQUIRE:''};
try {
  for(const crate of inventory.crates)local.add(crate.index,join(candidate,crate.file));
  await run('cargo',['install','hennery','--registry','crates-io','--version',`=${inventory.version}`,'--root',join(work,'install'),'--locked'],{cwd:work,env});
  const binary=join(work,'install/bin/hennery');
  await run('sh',[resolve('packaging/check-web-ui.sh'),binary],{env});
  await run(binary,['--version'],{env});
} finally {await local.close();}

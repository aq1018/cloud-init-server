var path = require('path');
var NodeGit = require('nodegit');

var DEFAULT_BRANCH = 'origin/master';
var DEFAULT_TEMP_DIR = '/tmp';
var REPO = process.env.GITHUB_REPO;
var TEMP_DIR = (process.env.TEMP_DIR || DEFAULT_TEMP_DIR);
var CLONE_DIR = path.join(TEMP_DIR, REPO); 
var REPO_URL = 'git@github.com:' + REPO + '.git';
var PUBLIC_KEY = process.env.GITHUB_DEPLOY_KEY_PUBLIC || 'keys/deploy_key.pub';
var PRIVATE_KEY = process.env.GITHUB_DEPLOY_KEY_PRIVATE || 'keys/deploy_key';
var KEY_PASSWORD = process.env.GITHUB_DEPLOY_KEY_PASSWORD || '';
var BRANCH = process.env.GITHUB_REPO_BRANCH ? "origin/" + process.env.GITHUB_REPO_BRANCH : DEFAULT_BRANCH;

var _repo, _ref;

function credentials(url, userName) {
  return NodeGit.Cred.sshKeyNew(
    userName,
    PUBLIC_KEY,
    PRIVATE_KEY,
    KEY_PASSWORD
  );  
}

function certificateCheck() {
  return 1;
}

function cloneOpts() {
  return { 
    fetchOpts : {
      callbacks: {
        certificateCheck: certificateCheck,
        credentials: credentials
      }
    }
  };
}

function setRepo(repo) {
  return _repo = repo;
}

function clone() {
  return NodeGit.Clone(REPO_URL, CLONE_DIR, cloneOpts());
}

function errorAndAttemptOpen() {
  return NodeGit.Repository.open(CLONE_DIR);
}

function getRef() {
  return NodeGit.Branch
    .lookup(_repo, BRANCH, NodeGit.Branch.BRANCH.REMOTE)
    .then(function(ref) {
      console.log(ref.id);
      _ref = ref;
    });
}

function checkout() {
  return NodeGit.Checkout.tree(_repo, _ref, {
    checkoutStrategy: NodeGit.Checkout.STRATEGY.SAFE_CREATE
  });
}

function setHead() {
  return repo.setHeadDetached(
    _ref, 
    _repo.defaultSignature, 
    'Checkout: HEAD ' + _ref.targetId()
  );
}

function fetch() {
  return getRef()
    .then(checkout)
    .then(setHead);
}

clone()
  .catch(errorAndAttemptOpen)
  .then(setRepo)
  .then(fetch)
  .done();

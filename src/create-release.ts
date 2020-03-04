// Copyright (c) 2018 GitHub, Inc. and contributors, MIT License
// Copyright (c) 2020 LoiLo, Inc, MIT License

const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const cp = require("child_process");
import * as semver from "semver";

async function execOutput(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    cp.exec(cmd, (error, stdout) => {
      error ? reject(error): resolve(stdout);
    });
  })
}

async function releaseBody(): Promise<string> {
  const tags = await execOutput("git tag");
  const vers: string[] = [];
  for (const i of tags.split("\n").map(l => semver.valid(l))) {
    if (i != null) vers.push(i);
  }
  const sorted = semver.sort(vers).reverse();
  const next = sorted[0];
  const curr = sorted[1];
  if (!next) {
    throw new Error("no semver in tags")
  }
  let range = "";
  if (curr) {
    // head to the first commit
    range = `head...${curr}`
  }
  return execOutput(`git log ${range} --oneline`);
}

export async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const tagName = core.getInput('tag_name', { required: true });

    // This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
    const tag = tagName.replace('refs/tags/', '');
    const releaseName = core.getInput('release_name', { required: true }).replace('refs/tags/', '');
    const body = await releaseBody();
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';

    // Create a release
    // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
    await github.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: releaseName,
      body,
      draft,
      prerelease
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

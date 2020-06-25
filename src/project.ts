import assert from 'assert';
import { client, createNewError, getYMLFromGHRepo, btoa } from './utils';
import { getNamespace, newNamespace, getCluster, getUniqueCluster } from './cluster';
import { GenericObjectType } from './types';

export interface IProject {
  clusterId: string;
  enableProjectMonitoring?: boolean;
  labels: {};
  name: string;
  type?: string;
  id: string;
}

export async function getProjectByNameAndClusterId(projectName: string, clusterId: string) {
  assert(projectName);
  assert(clusterId);
  const { data } = await client.get(`projects?name=${projectName}&clusterId=${clusterId}`);
  return (data.data as any) as Array<IProject>;
}

export async function getProject(projectName: string) {
  assert(projectName);
  const { data } = await client.get(`projects?name=${projectName}`);
  return (data.data as any) as Array<IProject>;
}

export async function newProject(obj: IProject) {
  assert(obj);
  obj.enableProjectMonitoring = obj.enableProjectMonitoring || false;
  obj.labels = obj.labels || {};
  obj.type = 'project';

  assert(obj.clusterId);
  assert(obj.name);
  const { data: newPrj } = await client.post(`/project`, obj);
  return newPrj as IProject;
}

export interface IRegistrySecret {
  name: string;
  projectId: string;
  type?: string;
  registries: {
    [registry: string]: { username: string; password: string };
  };
}

export async function addRegistrySecret(obj: IRegistrySecret) {
  assert(obj);
  assert(obj.name);
  assert(obj.projectId);
  assert(obj.registries);
  assert(Object.keys(obj.registries).length, 'Registry details are not specified');

  const { projectId } = obj;
  obj.type = 'dockerCredential';

  const { data } = await client.post(`/projects/${projectId}/dockercredential`, obj);
  return data;
}

export async function getUniqueProject(projectName: string) {
  if (projectName === 'System') {
    throw createNewError(
      'For `System` project, provide it with cluster name. Format: `System:<clusterName>`',
      'SYSTEM_PROJECT'
    );
  }

  let projectArr: IProject[] = [];
  if (projectName.indexOf(':') > -1) {
    // has cluster name in project name
    const [prjName, clusterName] = projectName.split(':');
    console.log('Fetched cluster name :', clusterName);

    const cluster = await getUniqueCluster(clusterName);

    projectArr = await getProjectByNameAndClusterId(prjName, cluster.id);
  } else {
    projectArr = await getProject(projectName);
  }

  if (projectArr.length > 1) {
    throw createNewError(`Found ${projectArr.length} projects with name: ${projectName}`, 'MULTIPLE_PROJECTS');
  }

  if (!projectArr.length) {
    throw createNewError(`No project found with name: ${projectName}`, 'INVALID_PROJECT_NAME');
  }

  return projectArr[0];
}

// catalog://?catalog=elastic&template=elasticsearch&version=7.7.1
export interface IApps {
  name: string;
  targetNamespace: string;
  catalogId: string;
  template: string;
  version: string;
  description?: string;
  labels?: Object;
  annotations?: Object;
  valuesYaml?: string;
  id: string;
}

export async function getApp(name: string, projectId: string) {
  assert(projectId);
  assert(name);
  const { data } = await client.get(`/projects/${projectId}/apps?name=${name}`);
  return (data.data as any) as Array<IApps>;
}

export async function deployApp(projectName: string, obj: Omit<IApps, 'id'>) {
  const { name, catalogId, template, version, description, labels, annotations, targetNamespace, valuesYaml } = obj;

  assert(name);
  assert(catalogId);
  assert(template);
  assert(version);
  assert(name);
  assert(targetNamespace);

  const project = await getUniqueProject(projectName);

  const { id: projectId, clusterId } = project;

  // find and create the namespace
  const namespaces = await getNamespace(targetNamespace, clusterId);

  if (!namespaces.length) {
    // create namespace
    await newNamespace({ clusterId, name: targetNamespace, projectId });
  }

  const externalId = `catalog://?catalog=${catalogId}&template=${template}&version=${version}`;

  // check if with name app already exists
  const appsArr = await getApp(name, projectId);

  if (appsArr.length) {
    // update the existing app
    const [app] = appsArr;
    const { data } = await client.post(`/project/${projectId}/apps/${app.id}?action=upgrade`, {
      externalId,
      valuesYaml,
      forceUpgrade: false,
      answers: {},
    });
  } else {
    // create a new app
    const { data } = await client.post(`/projects/${projectId}/apps`, {
      externalId,
      targetNamespace,
      description,
      name,
      labels,
      annotations,
      timeout: 300,
      wait: true,
      valuesYaml,
    });
    return data;
  }
}

export interface ISecret {
  projectId: string;
  labels?: {};
  name: string;
  type?: string;
  id: string;
  data: GenericObjectType;
}

export async function getSecret(secretName: string, projectId: string) {
  assert(projectId);
  assert(secretName);

  const { data } = await client.get(`projects/${projectId}/secrets?name=${secretName}`);
  return (data.data as any) as Array<ISecret>;
}

export async function newSecret(obj: Omit<ISecret, 'id'>) {
  assert(obj);
  obj.labels = obj.labels || {};
  obj.type = 'secret';

  assert(obj.projectId);
  assert(obj.name);
  assert(Object.keys(obj.data).length, 'Secret details are not specified');

  const data: GenericObjectType = {};
  for (const [k, v] of Object.entries(obj.data)) {
    data[k] = btoa(v);
  }

  obj.data = data;

  const { data: newSec } = await client.post(`projects/${obj.projectId}/secret`, obj);
  return newSec as ISecret;
}

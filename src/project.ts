import assert from 'assert';
import { client, createNewError, getYMLFromGHRepo } from './utils';

export interface IProject {
  clusterId: string;
  enableProjectMonitoring?: boolean;
  labels: {};
  name: string;
  type?: string;
  id?: string;
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
  assert(Object.entries(obj.registries).length, 'Registry details are not specified');

  const { projectId } = obj;
  obj.type = 'dockerCredential';

  const { data } = await client.post(`/projects/${projectId}/dockercredential`, obj);
  return data;
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
}
export async function deployApp(projectName: string, obj: IApps) {
  const { name, catalogId, template, version, description, labels, annotations, targetNamespace, valuesYaml } = obj;

  assert(name);
  assert(catalogId);
  assert(template);
  assert(version);
  assert(name);
  assert(targetNamespace);

  const externalId = `catalog://?catalog=${catalogId}&template=${template}&version=${version}`;

  const projects = await getProject(projectName);
  if (!projects.length) {
    throw createNewError(`No project found with name: ${projectName}`, 'INVALID_PROJECT_NAME');
  }
  const projectId = projects[0].id;

  const { data } = await client.post(`/projects/${projectId}/apps`, {
    externalId,
    targetNamespace,
    catalogId,
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

export async function deployES7(projectName: string, name: string, targetNamespace: string) {
  await deployApp(projectName, {
    catalogId: 'elastic',
    template: 'elasticsearch',
    version: '7.7.1',
    name,
    targetNamespace,
    valuesYaml: await getYMLFromGHRepo('helm/elasticsearch.yml'),
  });
}

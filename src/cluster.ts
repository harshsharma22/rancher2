import assert from 'assert';
import { client, createNewError } from './utils';

export async function getCluster(clusterName: string) {
  assert(clusterName);
  const { data } = await client.get(`/v3/clusters?name=${clusterName}`);
  return data.data;
}

export async function getUniqueCluster(clusterName: string) {
  const clusterArr = await getCluster(clusterName);
  if (clusterArr.length) {
    throw createNewError(`Found ${clusterArr.length} clusters with name: ${clusterName}`, 'MULTIPLE_CLUSTERS');
  }

  return clusterArr[0];
}

export async function getKubeconfig(clusterId: string) {
  assert(clusterId);
  const { data } = await client.post(`/clusters/${clusterId}?action=generateKubeconfig`);
  return data.config;
}

export interface INamespace {
  clusterId: string;
  labels?: {};
  name: string;
  projectId: string;
  resourceQuota?: {} | null;
  type?: string;
}

export async function newNamespace(obj: INamespace) {
  assert(obj);
  const { clusterId } = obj;
  obj.resourceQuota = obj.resourceQuota || null;
  obj.labels = obj.labels || {};
  obj.type = 'namespace';
  assert(clusterId);
  assert(obj.name);
  assert(obj.projectId);

  const { data: newNS } = await client.post(`/clusters/${clusterId}/namespace`, obj);
  return newNS;
}

export async function getNamespace(namespaceName: string, clusterId: string) {
  assert(clusterId);
  assert(namespaceName);
  const { data } = await client.get(`clusters/${clusterId}/namespaces?name=${namespaceName}`);
  return data;
}

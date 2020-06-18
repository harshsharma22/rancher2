import { deployApp, newSecret, getProject, getUniqueProject, getSecret } from './project';
import { getYMLFromGHRepo } from './utils';

const { S3_ACCESS_KEY, S3_ACCESS_SECRET, S3_SECRET_NAME = 's3' } = process.env;

export async function deployES7(projectName: string, name: string, targetNamespace: string) {
  const { id: projectId } = await getUniqueProject(projectName);

  if (S3_ACCESS_KEY && S3_ACCESS_SECRET) {
    // check if s3 secret already exists
    const secretArr = await getSecret(S3_SECRET_NAME, projectId);
    if (!secretArr.length) {
      // create secret
      await newSecret({
        projectId,
        name: S3_SECRET_NAME,
        data: {
          's3.client.default.access_key': S3_ACCESS_KEY,
          's3.client.default.secret_key': S3_ACCESS_SECRET,
        },
      });
    }
  } else {
    console.log('S3_ACCESS_KEY & S3_ACCESS_SECRET are not provided');
  }

  await deployApp(projectName, {
    catalogId: 'elastic',
    template: 'elasticsearch',
    version: '7.7.1',
    name,
    targetNamespace,
    valuesYaml: await getYMLFromGHRepo('helm/elasticsearch.yml'),
  });
}

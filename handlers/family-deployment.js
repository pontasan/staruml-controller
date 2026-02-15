module.exports = {
    prefix: 'deployment',
    label: 'Deployment Diagram',
    diagrams: { types: ['UMLDeploymentDiagram'] },
    resources: [
        { name: 'nodes', types: ['UMLNode'] },
        { name: 'node-instances', types: ['UMLNodeInstance'] },
        { name: 'artifact-instances', types: ['UMLArtifactInstance'] },
        { name: 'component-instances', types: ['UMLComponentInstance'] },
        { name: 'artifacts', types: ['UMLArtifact'] }
    ],
    relations: [
        { name: 'deployments', type: 'UMLDeployment' },
        { name: 'communication-paths', type: 'UMLCommunicationPath' },
        { name: 'dependencies', type: 'UMLDependency' }
    ]
}

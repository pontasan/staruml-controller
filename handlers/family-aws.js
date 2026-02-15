module.exports = {
    prefix: 'aws',
    label: 'AWS Diagram',
    diagrams: { types: ['AWSDiagram'] },
    resources: [
        {
            name: 'elements',
            types: [
                'AWSGroup', 'AWSGenericGroup', 'AWSAvailabilityZone',
                'AWSSecurityGroup', 'AWSService', 'AWSResource', 'AWSGeneralResource', 'AWSCallout'
            ]
        }
    ],
    relations: [
        { name: 'arrows', type: 'AWSArrow' }
    ]
}

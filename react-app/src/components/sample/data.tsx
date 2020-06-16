import React from 'react';
import { AsyncProcess, AsyncProcessStatus } from '../../redux/store/processing';
import SampleServiceClient, {
    SampleId, EpochTimeMS, SampleVersion, Username
} from '../../lib/comm/dynamicServices/SampleServiceClient';
import { AppError } from '@kbase/ui-components';
import Component from './view';
import { LoadingOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { UPSTREAM_TIMEOUT } from '../../constants';

export interface MetadataValue {
    value: string | number | boolean;
    units?: string;
    label: string;
    description?: string;
    isControlled: boolean;
}

export interface UserMetadataValue {
    value: string;
}

export interface Metadata {
    [key: string]: MetadataValue;
}

export interface UserMetadata {
    [key: string]: UserMetadataValue;
}

export type SampleType = 'BioReplicate' | 'TechReplicate' | 'SubSample';

export interface Sample {
    id: SampleId;
    name: string;
    created: {
        at: EpochTimeMS;
        by: Username;
    };
    currentVersion: {
        at: EpochTimeMS;
        by: Username;
        version: number;
    };
    latestVersion: {
        at: EpochTimeMS;
        by: Username;
        version: number;
    };
    source: string;
    sourceId: string;
    sourceParentId: string | null;
    type: SampleType;
    metadata: Metadata;
    userMetadata: UserMetadata;
}


export interface DataProps {
    serviceWizardURL: string;
    token: string;
    sampleId: SampleId;
    sampleVersion?: SampleVersion;
    setTitle: (title: string) => void;
}

interface DataState {
    loadingState: AsyncProcess<Sample, AppError>;
}

export default class Data extends React.Component<DataProps, DataState> {
    constructor(props: DataProps) {
        super(props);
        this.state = {
            loadingState: {
                status: AsyncProcessStatus.NONE
            }
        };
    }

    async fetchSample(props: DataProps) {
        try {
            if (this.state.loadingState.status === AsyncProcessStatus.SUCCESS) {
                this.setState({
                    loadingState: {
                        status: AsyncProcessStatus.REPROCESSING,
                        state: this.state.loadingState.state
                    }
                });
            } else {
                this.setState({
                    loadingState: {
                        status: AsyncProcessStatus.PROCESSING
                    }
                });
            }
            const client = new SampleServiceClient({
                token: props.token,
                url: props.serviceWizardURL,
                timeout: UPSTREAM_TIMEOUT
            });

            const sampleResult = await client.get_sample({
                id: props.sampleId,
                version: props.sampleVersion
            });

            const latestSample = await client.get_sample({
                id: props.sampleId
            });

            let firstSample;

            if (sampleResult.version === 1) {
                firstSample = sampleResult;
            } else {
                firstSample = await client.get_sample({
                    id: props.sampleId,
                    version: 1
                });
                if (sampleResult.version < latestSample.version) {
                } else {
                }
            }

            const actualSample = sampleResult.node_tree[0];

            const fieldKeys = Object.keys(actualSample.meta_user).concat(Object.keys(actualSample.meta_controlled));

            const fieldMetadata = await client.get_metadata_key_static_metadata({
                keys: fieldKeys,
                prefix: 0
            });

            const metadata: Metadata = Object.entries(actualSample.meta_user)
                .reduce((metadata, [key, field]) => {
                    const fieldMeta = fieldMetadata.static_metadata[key];
                    metadata[key] = {
                        label: fieldMeta.display_name,
                        description: fieldMeta.description,
                        value: field.value,
                        units: field.units,
                        isControlled: false
                    };
                    return metadata;
                }, {} as Metadata);

            Object.entries(actualSample.meta_controlled)
                .forEach(([key, field]) => {
                    const fieldMeta = fieldMetadata.static_metadata[key];
                    metadata[key] = {
                        label: fieldMeta.display_name,
                        description: fieldMeta.description,
                        value: field.value,
                        units: field.units,
                        isControlled: true
                    };
                });

            const userMetadata = {};

            const sample: Sample = {
                id: sampleResult.id,
                name: sampleResult.name,
                source: 'SESAR',
                sourceId: actualSample.id,
                sourceParentId: actualSample.parent,
                created: {
                    at: firstSample.save_date,
                    by: firstSample.user,
                },
                currentVersion: {
                    at: sampleResult.save_date,
                    by: sampleResult.user,
                    version: sampleResult.version
                },
                latestVersion: {
                    at: latestSample.save_date,
                    by: latestSample.user,
                    version: latestSample.version
                },
                type: actualSample.type,
                metadata,
                userMetadata
            };

            return this.setState({
                loadingState: {
                    status: AsyncProcessStatus.SUCCESS,
                    state: sample
                }
            });
        } catch (ex) {
            this.setState({
                loadingState: {
                    status: AsyncProcessStatus.ERROR,
                    error: {
                        code: 'data-load-error',
                        message: ex.message
                    }
                }
            });
        }
    }

    async componentDidMount() {
        this.fetchSample(this.props);
    }

    async componentDidUpdate(prevProps: DataProps, prevState: DataState) {
        // console.log('[componentDidUpdate]', prevProps.sampleId, this.props.sampleId,
        // prevProps.sampleVersion, this.props.sampleVersion);
        if (prevProps.sampleId !== this.props.sampleId ||
            prevProps.sampleVersion !== this.props.sampleVersion) {
            // console.log('fetching...', this.props);
            this.fetchSample(this.props);
        }
    }

    // static async getDerivedStateFromProps(nextProps: DataProps, prevState: DataState) {
    //     this.fetchSample();
    // }

    // async componentDidUpdate() {
    //     try {
    //         const client = new SampleServiceClient({
    //             token: this.props.token,
    //             url: this.props.serviceWizardURL
    //         });
    //         console.log('get sample', this.props.sampleId);
    //         const sample = await client.get_sample({
    //             id: this.props.sampleId
    //         });
    //         console.log('Sample!', sample);
    //         this.setState({
    //             loadingState: {
    //                 status: AsyncProcessStatus.SUCCESS,
    //                 state: sample
    //             }
    //         });
    //     } catch (ex) {
    //         console.log('Error!', ex);
    //         this.setState({
    //             loadingState: {
    //                 status: AsyncProcessStatus.ERROR,
    //                 error: {
    //                     code: 'data-load-error',
    //                     message: ex.message
    //                 }
    //             }
    //         });
    //     }
    // }

    renderNone() {
        return <LoadingOutlined />;
    }

    renderProcessing() {
        return <LoadingOutlined />;
    }

    renderError(error: AppError) {
        return <Alert type="error" message={error.message} />;
    }

    renderSuccess(sample: Sample) {
        return <Component sample={sample} setTitle={this.props.setTitle} />;
    }

    render() {
        // console.log('[Sample.render]', this.state);
        switch (this.state.loadingState.status) {
            case AsyncProcessStatus.NONE:
                return this.renderNone();
            case AsyncProcessStatus.PROCESSING:
                return this.renderProcessing();
            case AsyncProcessStatus.REPROCESSING:
                return this.renderProcessing();
            case AsyncProcessStatus.ERROR:
                return this.renderError(this.state.loadingState.error);
            case AsyncProcessStatus.SUCCESS:
                return this.renderSuccess(this.state.loadingState.state);
        }
    }
}

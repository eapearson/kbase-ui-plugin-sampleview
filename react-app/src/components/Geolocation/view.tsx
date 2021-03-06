import React from 'react';
import {
    Alert, Button, Col, Row, Switch, Tooltip
} from 'antd';
import {
    MapContainer as LeafletMap, Tooltip as LeafletTooltip, TileLayer, LayersControl,
    CircleMarker, ScaleControl
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Sample } from '../Main/types';
import MetadataField from '../MetadataField/view';

import './style.less';
import { FieldDefinitionsMap } from '../Main/data';
import { Section } from '../Section';

export interface GeolocationViewerProps {
    sample: Sample;
    fieldDefinitions: FieldDefinitionsMap;
}

interface GeolocationViewerState {
    omitEmpty: boolean;
    hasEmpty: boolean;
    emptyFieldCount: number;
}

export default class GeolocationViewer extends React.Component<GeolocationViewerProps, GeolocationViewerState> {
    constructor(props: GeolocationViewerProps) {
        super(props);
        this.state = {
            omitEmpty: true,
            hasEmpty: this.hasEmptyFields(),
            emptyFieldCount: this.emptyFieldCount()
        };
    }

    renderMap() {
        const data = this.props.sample.controlled;
        const { latitude, longitude } = data;

        // We don't know if they exist...
        if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
            return <Alert type="warning" message="Both latitude and longitude must be present to display a map location" />;
        }

        // And we don't know if they are the proper type of field...
        if (latitude.field.type !== 'number') {
            return <Alert type="warning" message="latitude must be numeric fields" />;
        }

        if (longitude.field.type !== 'number') {
            return <Alert type="warning" message="longitude must be numeric fields" />;
        }

        if (latitude.field.numberValue === null || longitude.field.numberValue === null) {
            return <Alert type="warning" message="Both latitude and longitude must be present to display a map location" />;
        }

        const lat = latitude.field.numberValue;
        const lng = longitude.field.numberValue;

        return <div className="Geolocation-map">
            <LeafletMap
                center={[lat, lng]}
                zoom={12}
                style={{ flex: '1 1 0px' }}>
                <ScaleControl position="topleft" />
                <LayersControl position="topright" >
                    <LayersControl.BaseLayer name="OpenStreetMap">
                        <TileLayer
                            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                            noWrap={true}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="OpenTopoMap">
                        <TileLayer
                            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                            url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                            noWrap={true}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="EsriWorldImagery" checked={true}>
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                            noWrap={true}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>
                <CircleMarker center={[lat, lng]} radius={10} color="red">
                    <LeafletTooltip >
                        <div>Location</div>
                        <div>Latitude: {lat}</div>
                        <div>Longitude: {lng}</div></LeafletTooltip>
                </CircleMarker>
            </LeafletMap>
        </div>;
    }

    onToggleHideEmpty() {
        this.setState({
            omitEmpty: !this.state.omitEmpty
        });
    }

    hasEmptyFields() {
        return Object.values(this.props.sample.metadata)
            .some((field) => {
                const def = this.props.fieldDefinitions[field.key];
                return field.isEmpty &&
                       field.type === 'controlled'  &&
                       def && def.kbase.categories && def.kbase.categories.includes('geolocation');
            });
    }

    emptyFieldCount() {
        return Object.values(this.props.sample.metadata)
            .filter((field) => {
                const def = this.props.fieldDefinitions[field.key];
                return field.isEmpty &&
                       field.type === 'controlled'  &&
                       def && def.kbase.categories && def.kbase.categories.includes('geolocation');
            }).length;
    }

    renderFields() {
        const sample = this.props.sample;
        const metadata = sample.metadata;
        const fields = Object.values(metadata)
            .filter((field) => {
                const def = this.props.fieldDefinitions[field.key];
                return def && def.kbase.categories && def.kbase.categories.includes('geolocation');
            })
            .filter((field) => {
                if (field.isEmpty && this.state.omitEmpty) {
                    return false;
                } else {
                    return true;
                }
            })
            .sort((a, b) => {
                return a.label.localeCompare(b.label);
            });

        const content = fields
            .map((field) => {
                return <div key={field.key}>
                    <div><Tooltip title={`key: ${field.key}`}><span>{field.label}</span></Tooltip></div>
                    <div><MetadataField field={field} sample={this.props.sample} /></div>
                </div>;
            });

        return <div className="InfoTable -bordered ControlledMetadata Geolocation-fields">
            {content}
        </div>;
    }

    renderToggleEmptyButton() {
        if (!this.state.hasEmpty) {
            return;
        }
        const label = (() => {
            if (this.state.omitEmpty) {
                return 'Show Empty Fields';
            } else {
                return 'Hide Empty Fields';
            }
        })();
        return <Button onClick={this.onToggleHideEmpty.bind(this)}
                size="small">
            {label}
        </Button>;
    }

    onChangeEmptySwitch(checked: boolean | undefined) {
        this.setState({
            omitEmpty: !checked
        })
    }

    renderToggleEmptySwitch() {
        if (!this.state.hasEmpty) {
            return;
        }
        return <div style={{display: 'flex', flexDirection: 'row', alignContent: 'center'}}>
            <span style={{marginRight: '1ex'}}>{this.state.emptyFieldCount} empty fields</span>
            <Switch
            onChange={this.onChangeEmptySwitch.bind(this)}
            checkedChildren={'showing'}
            unCheckedChildren={'hidden'}
            defaultChecked={false}
            />
        </div>
    }

    renderToolbar() {
        return <div>
            {this.renderToggleEmptySwitch()}
        </div>;
    }

    render() {
        return <div className="Geolocation" data-testid="metadataviewer" >
            <div className="Geolocation-body">
                <Row gutter={10}>
                    <Col span={12} flex="1 1 0px" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Section title="Map">
                            {this.renderMap()}
                        </Section>
                    </Col>
                    <Col span={12}>
                        <Section title="Fields" renderToolbar={this.renderToolbar.bind(this)}>
                            {/* {this.renderToolbar()} */}
                            {this.renderFields()}
                        </Section>
                    </Col>
                </Row>
            </div>
        </div>;
    }
}

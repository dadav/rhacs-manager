import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
import { Tooltip } from '../Tooltip';
export const DataListText = (_a) => {
    var { children = null, className = '', component = 'span', wrapModifier = null, tooltip: tooltipProp = '', onMouseEnter: onMouseEnterProp = () => { } } = _a, props = __rest(_a, ["children", "className", "component", "wrapModifier", "tooltip", "onMouseEnter"]);
    const Component = component;
    const [tooltip, setTooltip] = useState('');
    const onMouseEnter = (event) => {
        if (event.target.offsetWidth < event.target.scrollWidth) {
            setTooltip(tooltipProp || event.target.innerHTML);
        }
        else {
            setTooltip('');
        }
        onMouseEnterProp(event);
    };
    const text = (_jsx(Component, Object.assign({ onMouseEnter: onMouseEnter, className: css(className, wrapModifier && styles.modifiers[wrapModifier], styles.dataListText) }, props, { children: children })));
    return tooltip !== '' ? (_jsx(Tooltip, { content: tooltip, isVisible: true, children: text })) : (text);
};
DataListText.displayName = 'DataListText';
//# sourceMappingURL=DataListText.js.map
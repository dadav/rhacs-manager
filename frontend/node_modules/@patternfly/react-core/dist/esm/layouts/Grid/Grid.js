import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/layouts/Grid/grid.mjs';
import { css } from '@patternfly/react-styles';
import { DeviceSizes } from '../../styles/sizes';
import * as gridToken from '@patternfly/react-tokens/dist/esm/l_grid_item_Order';
import { setBreakpointCssVars } from '../../helpers/util';
export const Grid = (_a) => {
    var { children = null, className = '', component = 'div', hasGutter, span = null, order, style } = _a, props = __rest(_a, ["children", "className", "component", "hasGutter", "span", "order", "style"]);
    const classes = [styles.grid, span && styles.modifiers[`all_${span}Col`]];
    const Component = component;
    Object.entries(DeviceSizes).forEach(([propKey, gridSpanModifier]) => {
        const key = propKey;
        const propValue = props[key];
        if (propValue) {
            classes.push(styles.modifiers[`all_${propValue}ColOn${gridSpanModifier}`]);
        }
        delete props[key];
    });
    return (_jsx(Component, Object.assign({ className: css(...classes, hasGutter && styles.modifiers.gutter, className), style: style || order ? Object.assign(Object.assign({}, style), setBreakpointCssVars(order, gridToken.l_grid_item_Order.name)) : undefined }, props, { children: children })));
};
Grid.displayName = 'Grid';
//# sourceMappingURL=Grid.js.map
import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Component, forwardRef } from 'react';
import styles from '@patternfly/react-styles/css/components/Toolbar/toolbar.mjs';
import { css } from '@patternfly/react-styles';
import { formatBreakpointMods, toCamel } from '../../helpers/util';
import { PageContext } from '../Page/PageContext';
export var ToolbarGroupVariant;
(function (ToolbarGroupVariant) {
    ToolbarGroupVariant["filter-group"] = "filter-group";
    ToolbarGroupVariant["action-group"] = "action-group";
    ToolbarGroupVariant["action-group-inline"] = "action-group-inline";
    ToolbarGroupVariant["action-group-plain"] = "action-group-plain";
    ToolbarGroupVariant["label-group"] = "label-group";
})(ToolbarGroupVariant || (ToolbarGroupVariant = {}));
class ToolbarGroupWithRef extends Component {
    render() {
        const _a = this.props, { visibility, align, alignItems, alignSelf, gap, columnGap, rowGap, rowWrap, className, variant, children, isOverflowContainer, innerRef } = _a, props = __rest(_a, ["visibility", "align", "alignItems", "alignSelf", "gap", "columnGap", "rowGap", "rowWrap", "className", "variant", "children", "isOverflowContainer", "innerRef"]);
        return (_jsx(PageContext.Consumer, { children: ({ width, getBreakpoint }) => (_jsx("div", Object.assign({ className: css(styles.toolbarGroup, variant &&
                    styles.modifiers[toCamel(variant)], formatBreakpointMods(visibility, styles, '', getBreakpoint(width)), formatBreakpointMods(align, styles, '', getBreakpoint(width)), formatBreakpointMods(gap, styles, '', getBreakpoint(width)), formatBreakpointMods(columnGap, styles, '', getBreakpoint(width)), formatBreakpointMods(rowGap, styles, '', getBreakpoint(width)), formatBreakpointMods(rowWrap, styles, '', getBreakpoint(width)), alignItems === 'start' && styles.modifiers.alignItemsStart, alignItems === 'center' && styles.modifiers.alignItemsCenter, alignItems === 'baseline' && styles.modifiers.alignItemsBaseline, alignSelf === 'start' && styles.modifiers.alignSelfStart, alignSelf === 'center' && styles.modifiers.alignSelfCenter, alignSelf === 'baseline' && styles.modifiers.alignSelfBaseline, isOverflowContainer && styles.modifiers.overflowContainer, className) }, props, { ref: innerRef, children: children }))) }));
    }
}
export const ToolbarGroup = forwardRef((props, ref) => (_jsx(ToolbarGroupWithRef, Object.assign({}, props, { innerRef: ref }))));
//# sourceMappingURL=ToolbarGroup.js.map
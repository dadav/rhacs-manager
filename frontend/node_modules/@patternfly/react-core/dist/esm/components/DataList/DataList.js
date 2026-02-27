import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, forwardRef } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
const gridBreakpointClasses = {
    none: styles.modifiers.gridNone,
    always: 'pf-m-grid', // Placeholder per https://github.com/patternfly/patternfly-react/issues/4965#issuecomment-704984236
    sm: styles.modifiers.gridSm,
    md: styles.modifiers.gridMd,
    lg: styles.modifiers.gridLg,
    xl: styles.modifiers.gridXl,
    '2xl': styles.modifiers.grid_2xl
};
export var DataListWrapModifier;
(function (DataListWrapModifier) {
    DataListWrapModifier["nowrap"] = "nowrap";
    DataListWrapModifier["truncate"] = "truncate";
    DataListWrapModifier["breakWord"] = "breakWord";
})(DataListWrapModifier || (DataListWrapModifier = {}));
export const DataListContext = createContext({
    isSelectable: false
});
export const DataListBase = (_a) => {
    var { children = null, className = '', 'aria-label': ariaLabel, onSelectDataListItem, selectedDataListItemId = '', isCompact = false, gridBreakpoint = 'md', wrapModifier = null, onSelectableRowChange, innerRef } = _a, props = __rest(_a, ["children", "className", 'aria-label', "onSelectDataListItem", "selectedDataListItemId", "isCompact", "gridBreakpoint", "wrapModifier", "onSelectableRowChange", "innerRef"]);
    const isSelectable = onSelectDataListItem !== undefined;
    const updateSelectedDataListItem = (event, id) => {
        onSelectDataListItem(event, id);
    };
    return (_jsx(DataListContext.Provider, { value: {
            isSelectable,
            selectedDataListItemId,
            updateSelectedDataListItem,
            onSelectableRowChange
        }, children: _jsx("ul", Object.assign({ className: css(styles.dataList, isCompact && styles.modifiers.compact, gridBreakpointClasses[gridBreakpoint], wrapModifier && styles.modifiers[wrapModifier], className), style: props.style, role: "list", "aria-label": ariaLabel, ref: innerRef }, props, { children: children })) }));
};
DataListBase.displayName = 'DataListBase';
export const DataList = forwardRef((props, ref) => (_jsx(DataListBase, Object.assign({ innerRef: ref }, props))));
DataList.displayName = 'DataList';
//# sourceMappingURL=DataList.js.map
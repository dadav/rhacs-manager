import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Children, cloneElement, isValidElement } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
export const DataListItemRow = (_a) => {
    var { children, className = '', rowid = '', wrapModifier = null } = _a, props = __rest(_a, ["children", "className", "rowid", "wrapModifier"]);
    return (_jsx("div", Object.assign({ className: css(styles.dataListItemRow, className, wrapModifier && styles.modifiers[wrapModifier]) }, props, { children: Children.map(children, (child) => isValidElement(child) &&
            cloneElement(child, {
                rowid
            })) })));
};
DataListItemRow.displayName = 'DataListItemRow';
//# sourceMappingURL=DataListItemRow.js.map
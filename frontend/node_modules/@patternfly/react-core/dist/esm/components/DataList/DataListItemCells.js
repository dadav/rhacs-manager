import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
export const DataListItemCells = (_a) => {
    var { className = '', dataListCells, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rowid = '' } = _a, props = __rest(_a, ["className", "dataListCells", "rowid"]);
    return (_jsx("div", Object.assign({ className: css(styles.dataListItemContent, className) }, props, { children: dataListCells })));
};
DataListItemCells.displayName = 'DataListItemCells';
//# sourceMappingURL=DataListItemCells.js.map
import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
import { Checkbox } from '../Checkbox';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
export const DataListCheck = (_a) => {
    var { id, className, onChange, isValid = true, isDisabled = false, isChecked, checked, defaultChecked, otherControls = false } = _a, props = __rest(_a, ["id", "className", "onChange", "isValid", "isDisabled", "isChecked", "checked", "defaultChecked", "otherControls"]);
    const check = (_jsx("div", { className: css(styles.dataListCheck), children: _jsx(GenerateId, { children: (randomId) => (_jsx(Checkbox, Object.assign({ id: id !== null && id !== void 0 ? id : `datalist-check-${randomId}`, isChecked: isChecked, checked: checked, defaultChecked: defaultChecked, onChange: onChange, "aria-invalid": !isValid, isDisabled: isDisabled, isLabelWrapped: true }, props))) }) }));
    return (_jsxs(Fragment, { children: [!otherControls && _jsx("div", { className: css(styles.dataListItemControl, className), children: check }), otherControls && check] }));
};
DataListCheck.displayName = 'DataListCheck';
//# sourceMappingURL=DataListCheck.js.map
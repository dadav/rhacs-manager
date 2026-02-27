"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListText = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const Tooltip_1 = require("../Tooltip");
const DataListText = (_a) => {
    var { children = null, className = '', component = 'span', wrapModifier = null, tooltip: tooltipProp = '', onMouseEnter: onMouseEnterProp = () => { } } = _a, props = tslib_1.__rest(_a, ["children", "className", "component", "wrapModifier", "tooltip", "onMouseEnter"]);
    const Component = component;
    const [tooltip, setTooltip] = (0, react_1.useState)('');
    const onMouseEnter = (event) => {
        if (event.target.offsetWidth < event.target.scrollWidth) {
            setTooltip(tooltipProp || event.target.innerHTML);
        }
        else {
            setTooltip('');
        }
        onMouseEnterProp(event);
    };
    const text = ((0, jsx_runtime_1.jsx)(Component, Object.assign({ onMouseEnter: onMouseEnter, className: (0, react_styles_1.css)(className, wrapModifier && data_list_1.default.modifiers[wrapModifier], data_list_1.default.dataListText) }, props, { children: children })));
    return tooltip !== '' ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: tooltip, isVisible: true, children: text })) : (text);
};
exports.DataListText = DataListText;
exports.DataListText.displayName = 'DataListText';
//# sourceMappingURL=DataListText.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleGroupItemElement = exports.ToggleGroupItemVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const toggle_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ToggleGroup/toggle-group"));
var ToggleGroupItemVariant;
(function (ToggleGroupItemVariant) {
    ToggleGroupItemVariant["icon"] = "icon";
    ToggleGroupItemVariant["text"] = "text";
})(ToggleGroupItemVariant || (exports.ToggleGroupItemVariant = ToggleGroupItemVariant = {}));
const ToggleGroupItemElement = ({ variant, children }) => ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(variant === 'icon' && toggle_group_1.default.toggleGroupIcon, variant === 'text' && toggle_group_1.default.toggleGroupText), children: children }));
exports.ToggleGroupItemElement = ToggleGroupItemElement;
exports.ToggleGroupItemElement.displayName = 'ToggleGroupItemElement';
//# sourceMappingURL=ToggleGroupItemElement.js.map
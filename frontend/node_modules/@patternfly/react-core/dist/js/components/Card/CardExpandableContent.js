"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardExpandableContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const card_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Card/card"));
const react_styles_1 = require("@patternfly/react-styles");
const Card_1 = require("./Card");
const CardExpandableContent = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)(Card_1.CardContext.Consumer, { children: ({ isExpanded }) => isExpanded ? ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(card_1.default.cardExpandableContent, className) }, props, { children: children }))) : null }));
};
exports.CardExpandableContent = CardExpandableContent;
exports.CardExpandableContent.displayName = 'CardExpandableContent';
//# sourceMappingURL=CardExpandableContent.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardTitle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const card_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Card/card"));
const Card_1 = require("./Card");
const CardTitle = (_a) => {
    var { children, className, component = 'div' } = _a, props = tslib_1.__rest(_a, ["children", "className", "component"]);
    const { cardId } = (0, react_1.useContext)(Card_1.CardContext);
    const Component = component;
    const titleId = cardId ? `${cardId}-title` : '';
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(card_1.default.cardTitle), children: (0, jsx_runtime_1.jsx)(Component, Object.assign({ className: (0, react_styles_1.css)(card_1.default.cardTitleText, className), id: titleId || undefined }, props, { children: children })) }));
};
exports.CardTitle = CardTitle;
exports.CardTitle.displayName = 'CardTitle';
//# sourceMappingURL=CardTitle.js.map
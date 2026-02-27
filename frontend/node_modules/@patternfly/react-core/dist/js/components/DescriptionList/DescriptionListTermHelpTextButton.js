"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescriptionListTermHelpTextButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const description_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DescriptionList/description-list"));
const react_styles_1 = require("@patternfly/react-styles");
const DescriptionListTermHelpTextButton = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    const helpTextRef = (0, react_1.createRef)();
    const handleKeys = (event) => {
        if (!helpTextRef.current || helpTextRef.current !== event.target) {
            return;
        }
        const key = event.key;
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            helpTextRef.current.click();
        }
    };
    return ((0, jsx_runtime_1.jsx)("span", Object.assign({ ref: helpTextRef, className: (0, react_styles_1.css)(className, description_list_1.default.descriptionListText, description_list_1.default.modifiers.helpText), role: "button", type: "button", tabIndex: 0, onKeyDown: (event) => handleKeys(event) }, props, { children: children })));
};
exports.DescriptionListTermHelpTextButton = DescriptionListTermHelpTextButton;
exports.DescriptionListTermHelpTextButton.displayName = 'DescriptionListTermHelpTextButton';
//# sourceMappingURL=DescriptionListTermHelpTextButton.js.map
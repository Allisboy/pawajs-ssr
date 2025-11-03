/**
 * Represents a Pawa component instance.
 * @class
 */
class PawaComponent {
    /**
     * @param {Function} func - The component function that defines rendering logic.
     */
    constructor(func) {
      /**
       * Default props for the component (currently unused).
       * @type {Object}
       */
      this.prop = {};
      /**
     * Props Validation rules set for the component (when called)
     * @type {Object{[any]:{strict:boolean,err:string,default:any,type:any}}>}
     */
    this.validPropRule=func?.validateProps || {};
      /**
       * The component function.
       * @type {Function}
       */
      this.component = func;
      /**
       * Tracks whether the component has been rendered.
       * @type {boolean}
       */
      this._hasRun = false;
      /**
       * Data to inject into the rendering context.
       * @type {Object}
       */
      this._insert = {};
      /**
       * Lifecycle hooks for mount, unmount, and effects.
       * @type {{effect: Array, isMount: Array, isUnMount: Array}}
       */
      this._hook = {
        effect: [],
        isMount: [],
        isUnMount: [],
      };
      /**
       * Map for non-reactive internal state (currently unused).
       * @type {Map}
       */
      this._innerState = new Map();
      /**
       * Map for reactive state created via $state.
       * @type {Map}
       */
      this._stateMap = new Map();
      /**
       * Stores the previous context for scoping.
       * @type {Object|null}
       */
      this._formerContext = null;
      /**
       * @type {boolean}
       */
      this._isAction=false
      /**
       * @type{object}
       */
      this._action={}
    }
    /**
     * Returns the component function.
     * @returns {Function}
     */
    getComponent() {
      return this.component;
    }
}
module.exports = PawaComponent
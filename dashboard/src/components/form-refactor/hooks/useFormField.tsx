import { useContext, useEffect } from "react";
import { PorterFormContext } from "../PorterFormContextProvider";
import {
  PorterFormFieldFieldState,
  PorterFormFieldValidationState,
  PorterFormVariableList,
} from "../types";

interface FormFieldData<T> {
  state: T;
  variables: PorterFormVariableList;
  updateState: (updateFunc: (prev: T) => T) => void;
  mutateVars: (
    mutateFunc: (vars: PorterFormVariableList) => PorterFormVariableList
  ) => void;
  updateValidation: (
    updateFunc: (
      state: PorterFormFieldValidationState
    ) => PorterFormFieldValidationState
  ) => void;
}

interface Options<T> {
  initValue: T;
  initValidation?: Partial<PorterFormFieldValidationState>;
  initVars?: PorterFormVariableList;
}

const useFormField = <T extends PorterFormFieldFieldState>(
  fieldId: string,
  { initValue, initVars, initValidation }: Options<T>
): FormFieldData<T> => {
  const { dispatchAction, formState } = useContext(PorterFormContext);

  useEffect(() => {
    dispatchAction({
      type: "init-field",
      id: fieldId,
      initValue,
      initValidation,
      initVars,
    });
  }, []);

  const updateState = (updateFunc: (prev: T) => T) => {
    dispatchAction({
      type: "update-field",
      id: fieldId,
      updateFunc,
    });
  };

  const mutateVars = (
    mutateFunc: (vars: PorterFormVariableList) => PorterFormVariableList
  ) => {
    dispatchAction({
      type: "mutate-vars",
      mutateFunc,
    });
  };

  const updateValidation = (
    updateFunc: (
      state: PorterFormFieldValidationState
    ) => PorterFormFieldValidationState
  ) => {
    dispatchAction({
      id: fieldId,
      type: "update-validation",
      updateFunc,
    });
  };

  return {
    state: formState.components[fieldId]?.state as T,
    variables: formState.variables,
    updateState,
    mutateVars,
    updateValidation,
  };
};

export default useFormField;

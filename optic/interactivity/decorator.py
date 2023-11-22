from typing import Any, TypeVar, Callable, Type, cast

from .key import key_from_proto

from . import events
from ..component_helpers.helper import get_qualified_fn_name
from optic.runtime import runtime
import protos.ui_pb2 as pb

A = TypeVar("A")
S = TypeVar("S")
Handler = Callable[[S, A], None]


def handler(actionType: Type[A]) -> Callable[[Handler[S, A]], Handler[S, A]]:
    def register(func: Handler[S, A]):
        def wrapper(state: S, action: A):
            # This is guaranteed to be a UserEvent because only Optic
            # framework will call the wrapper.
            typed_action = cast(pb.UserEvent, action)
            key = key_from_proto(typed_action.key)

            if actionType == events.CheckboxEvent:
                typed_action = events.CheckboxEvent(checked=typed_action.bool, key=key)

            return func(state, cast(Any, typed_action))

        wrapper.__module__ = func.__module__
        wrapper.__name__ = func.__name__

        runtime.register_handler(get_qualified_fn_name(func), wrapper)
        return wrapper

    return register
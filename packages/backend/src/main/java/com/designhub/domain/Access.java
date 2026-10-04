package com.designhub.domain;

/**
 * Ordered access levels. MAKER designs and submits for approval. EDITOR is the approver: everything a Maker can do,
 * plus approving, requesting changes and publishing. Ordered project access levels; a higher ordinal always implies every lower one. */
public enum Access {
    VIEWER, COMMENTER, MAKER, EDITOR, OWNER;

    public boolean atLeast(Access min) {
        return ordinal() >= min.ordinal();
    }
}

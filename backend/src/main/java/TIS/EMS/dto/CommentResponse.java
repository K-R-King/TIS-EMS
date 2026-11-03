package TIS.EMS.dto;

import TIS.EMS.models.ExpenseComment;

import java.time.Instant;

public record CommentResponse(Long id, UserResponse author, String text, Instant createdAt) {
    public static CommentResponse from(ExpenseComment c) {
        return new CommentResponse(c.getId(), UserResponse.from(c.getAuthor()), c.getText(), c.getCreatedAt());
    }
}

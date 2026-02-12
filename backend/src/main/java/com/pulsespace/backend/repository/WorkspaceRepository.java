package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.workspace.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    // 소유자로 워크스페이스 찾기
    List<Workspace> findByOwnerId(Long ownerId);
}